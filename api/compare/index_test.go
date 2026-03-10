package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"keskealsaydim/pkg/finance"
)

func TestHandlerNormalizesSymbolsAndBuildsCompareResponse(t *testing.T) {
	originalGetHistory := getHistory
	t.Cleanup(func() {
		getHistory = originalGetHistory
	})

	getHistory = func(symbol, from, to, interval string) (*finance.History, error) {
		switch symbol {
		case "THYAO":
			return &finance.History{
				Symbol: symbol,
				Data: []finance.HistoryPoint{
					{Date: "2025-01-01", Close: 10},
					{Date: "2025-01-02", Close: 12},
				},
			}, nil
		case "GARAN":
			return &finance.History{
				Symbol: symbol,
				Data: []finance.HistoryPoint{
					{Date: "2025-01-01", Close: 20},
					{Date: "2025-01-02", Close: 21},
				},
			}, nil
		default:
			return nil, errors.New("unexpected symbol")
		}
	}

	body := []byte(`{
		"symbolA":"thyao.is",
		"symbolB":"garan",
		"startDate":"2025-01-01",
		"endDate":"2025-01-02",
		"amount":0
	}`)

	req := httptest.NewRequest(http.MethodPost, "/api/compare", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	Handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", rec.Code, rec.Body.String())
	}

	var resp compareResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.SymbolA != "THYAO" {
		t.Fatalf("expected normalized symbolA THYAO, got %s", resp.SymbolA)
	}
	if resp.SymbolB != "GARAN" {
		t.Fatalf("expected normalized symbolB GARAN, got %s", resp.SymbolB)
	}
	if resp.Amount != 1000 {
		t.Fatalf("expected default amount 1000, got %v", resp.Amount)
	}
	if resp.AmountType != "MONEY" {
		t.Fatalf("expected default amount type MONEY, got %s", resp.AmountType)
	}
	if resp.Result.Difference.WinnerSymbol != "A" {
		t.Fatalf("expected THYAO to win, got %s", resp.Result.Difference.WinnerSymbol)
	}
}

func TestHandlerRejectsMissingStartDate(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/compare", bytes.NewBufferString(`{"symbolA":"THYAO","symbolB":"GARAN"}`))
	rec := httptest.NewRecorder()

	Handler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}
}
