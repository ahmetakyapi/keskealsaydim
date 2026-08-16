package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"keskealsaydim/pkg/finance"
)

func fixedNow() time.Time { return time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC) }

// stubHistory installs deterministic price data and freezes the clock.
func stubHistory(t *testing.T, fn func(symbol, from, to, interval string) (*finance.History, error)) {
	t.Helper()
	originalHistory, originalRates, originalNow := getHistory, getRates, timeNow
	t.Cleanup(func() {
		getHistory, getRates, timeNow = originalHistory, originalRates, originalNow
	})
	getHistory = fn
	timeNow = fixedNow
}

func post(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/compare", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()
	Handler(rec, req)
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) compareResponse {
	t.Helper()
	var resp compareResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v (body: %s)", err, rec.Body.String())
	}
	return resp
}

func tryHistory(symbol string, closes map[string]float64) *finance.History {
	points := make([]finance.HistoryPoint, 0, len(closes))
	for _, date := range sortedKeys(closes) {
		points = append(points, finance.HistoryPoint{Date: date, Close: closes[date]})
	}
	return &finance.History{Symbol: symbol, Currency: "TRY", Data: points}
}

func sortedKeys(m map[string]float64) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j] < keys[j-1]; j-- {
			keys[j], keys[j-1] = keys[j-1], keys[j]
		}
	}
	return keys
}

func TestHandlerNormalizesSymbolsAndBuildsCompareResponse(t *testing.T) {
	stubHistory(t, func(symbol, _, _, _ string) (*finance.History, error) {
		switch symbol {
		case "THYAO":
			return tryHistory(symbol, map[string]float64{"2026-01-01": 10, "2026-01-02": 12}), nil
		case "GARAN":
			return tryHistory(symbol, map[string]float64{"2026-01-01": 20, "2026-01-02": 21}), nil
		default:
			return nil, errors.New("unexpected symbol")
		}
	})

	rec := post(t, `{
		"symbolA":"thyao.is",
		"symbolB":"garan",
		"startDate":"2026-01-01",
		"endDate":"2026-01-02",
		"amount":0
	}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", rec.Code, rec.Body.String())
	}

	resp := decode(t, rec)
	if resp.SymbolA != "THYAO" || resp.SymbolB != "GARAN" {
		t.Fatalf("symbols not normalised: %s / %s", resp.SymbolA, resp.SymbolB)
	}
	if resp.Amount != 1000 {
		t.Fatalf("expected the default amount of 1000, got %v", resp.Amount)
	}
	// THYAO +20%, GARAN +5%.
	if resp.Result.Difference.WinnerSymbol != "A" {
		t.Fatalf("expected THYAO to win, got %s", resp.Result.Difference.WinnerSymbol)
	}
}

func TestHandlerReturnsChartSeries(t *testing.T) {
	stubHistory(t, func(symbol, _, _, _ string) (*finance.History, error) {
		return tryHistory(symbol, map[string]float64{
			"2026-01-01": 10, "2026-01-02": 11, "2026-01-05": 12,
		}), nil
	})

	rec := post(t, `{"symbolA":"THYAO","symbolB":"GARAN","startDate":"2026-01-01","endDate":"2026-01-05","amount":1000}`)
	resp := decode(t, rec)

	if len(resp.Result.Series) != 3 {
		t.Fatalf("expected one point per aligned trading day, got %d", len(resp.Result.Series))
	}
	if resp.Result.Series[0].Date != "2026-01-01" {
		t.Fatalf("series should start at the first common day, got %s", resp.Result.Series[0].Date)
	}
	// 1000 TL at a price of 10 buys 100 units; the first value is the capital.
	if math.Abs(resp.Result.Series[0].ValueA-1000) > 0.01 {
		t.Fatalf("expected the first value to equal the invested amount, got %v", resp.Result.Series[0].ValueA)
	}
	if resp.Result.Metrics.TradingDays != 3 {
		t.Fatalf("expected 3 trading days, got %d", resp.Result.Metrics.TradingDays)
	}
}

func TestHandlerAlignsDifferentTradingCalendars(t *testing.T) {
	// BIST trades on the 6th, the US market does not; the US leg must carry
	// its previous close forward rather than dropping the day.
	stubHistory(t, func(symbol, _, _, _ string) (*finance.History, error) {
		switch symbol {
		case "THYAO":
			return tryHistory(symbol, map[string]float64{
				"2026-01-05": 10, "2026-01-06": 11, "2026-01-07": 12,
			}), nil
		case "AAPL":
			return tryHistory(symbol, map[string]float64{
				"2026-01-05": 100, "2026-01-07": 110,
			}), nil
		default:
			return nil, errors.New("unexpected symbol")
		}
	})

	rec := post(t, `{"symbolA":"THYAO","symbolB":"AAPL","startDate":"2026-01-05","endDate":"2026-01-07","amount":1000}`)
	resp := decode(t, rec)

	if len(resp.Result.Series) != 3 {
		t.Fatalf("expected 3 aligned days, got %d", len(resp.Result.Series))
	}
	// On the 6th AAPL has no bar, so its value must equal the 5th's.
	if resp.Result.Series[1].ValueB != resp.Result.Series[0].ValueB {
		t.Fatalf("expected the missing day to carry forward: %v vs %v",
			resp.Result.Series[1].ValueB, resp.Result.Series[0].ValueB)
	}
}

func TestHandlerConvertsForeignCurrencyToTRY(t *testing.T) {
	originalHistory, originalRates, originalNow := getHistory, getRates, timeNow
	t.Cleanup(func() { getHistory, getRates, timeNow = originalHistory, originalRates, originalNow })
	timeNow = fixedNow

	getHistory = func(symbol, _, _, _ string) (*finance.History, error) {
		switch symbol {
		case "THYAO":
			return tryHistory(symbol, map[string]float64{"2026-01-01": 100, "2026-01-02": 100}), nil
		case "AAPL":
			// Flat in dollars across the window.
			return &finance.History{
				Symbol:   symbol,
				Currency: "USD",
				Data: []finance.HistoryPoint{
					{Date: "2026-01-01", Close: 10},
					{Date: "2026-01-02", Close: 10},
				},
			}, nil
		default:
			return nil, errors.New("unexpected symbol")
		}
	}

	// The lira halves against the dollar over the window.
	getRates = func(currency, _, _ string) (*finance.RateSeries, error) {
		if currency != "USD" {
			t.Fatalf("unexpected currency lookup: %s", currency)
		}
		return finance.NewRateSeriesForTest("USD", map[string]float64{
			"2026-01-01": 30,
			"2026-01-02": 60,
		}), nil
	}

	rec := post(t, `{"symbolA":"THYAO","symbolB":"AAPL","startDate":"2026-01-01","endDate":"2026-01-02","amount":1000}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", rec.Code, rec.Body.String())
	}
	resp := decode(t, rec)

	if resp.Result.SymbolB.Currency != "USD" {
		t.Fatalf("expected the traded currency to be reported, got %q", resp.Result.SymbolB.Currency)
	}
	// A flat dollar price plus a doubled exchange rate is a 100% lira gain —
	// the whole point of converting per-day rather than at today's rate.
	if math.Abs(resp.Result.SymbolB.ProfitPercent-100) > 0.01 {
		t.Fatalf("expected a 100%% TRY gain from the FX move, got %v", resp.Result.SymbolB.ProfitPercent)
	}
	if resp.Result.Difference.WinnerSymbol != "B" {
		t.Fatalf("expected AAPL to win once FX is applied, got %s", resp.Result.Difference.WinnerSymbol)
	}
}

func TestHandlerRejectsMissingStartDate(t *testing.T) {
	if rec := post(t, `{"symbolA":"THYAO","symbolB":"GARAN"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestHandlerRejectsIdenticalSymbols(t *testing.T) {
	rec := post(t, `{"symbolA":"THYAO","symbolB":"thyao","startDate":"2026-01-01"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when both legs are the same symbol, got %d", rec.Code)
	}
}

func TestHandlerRejectsSaveWithoutAuthentication(t *testing.T) {
	stubHistory(t, func(symbol, _, _, _ string) (*finance.History, error) {
		return tryHistory(symbol, map[string]float64{"2026-01-01": 10, "2026-01-02": 11}), nil
	})

	rec := post(t, `{"symbolA":"THYAO","symbolB":"GARAN","startDate":"2026-01-01","endDate":"2026-01-02","saveScenario":true}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 so the caller learns the scenario was not saved, got %d", rec.Code)
	}
}

func TestDownsampleKeepsEndpoints(t *testing.T) {
	points := make([]seriesPoint, 1000)
	for i := range points {
		points[i] = seriesPoint{Date: time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC).
			AddDate(0, 0, i).Format("2006-01-02"), ValueA: float64(i)}
	}

	out := downsample(points, 100)
	if len(out) != 100 {
		t.Fatalf("expected 100 points, got %d", len(out))
	}
	if out[0] != points[0] {
		t.Fatal("downsampling must keep the first point")
	}
	if out[len(out)-1] != points[len(points)-1] {
		t.Fatal("downsampling must keep the last point")
	}
}

func TestSummarizeReportsDrawdown(t *testing.T) {
	points := []seriesPoint{
		{ValueA: 100}, {ValueA: 150}, {ValueA: 75}, {ValueA: 120},
	}
	stats := summarize(points, func(p seriesPoint) float64 { return p.ValueA })

	if stats.best != 150 {
		t.Fatalf("expected a peak of 150, got %v", stats.best)
	}
	if stats.worst != 75 {
		t.Fatalf("expected a trough of 75, got %v", stats.worst)
	}
	// 150 → 75 is a 50% fall from the peak.
	if math.Abs(stats.maxDrawdown-50) > 0.01 {
		t.Fatalf("expected a 50%% drawdown, got %v", stats.maxDrawdown)
	}
}
