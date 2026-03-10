// Package finance provides a Yahoo Finance HTTP client.
// Directly calls the undocumented but stable v8 chart API.
package finance

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

// BIST symbol → Turkish name mapping
var bistSymbols = map[string]string{
	"THYAO": "Türk Hava Yolları",
	"GARAN": "Garanti BBVA",
	"AKBNK": "Akbank",
	"YKBNK": "Yapı Kredi",
	"ISCTR": "İş Bankası",
	"HALKB": "Halkbank",
	"VAKBN": "Vakıfbank",
	"SISE":  "Şişe Cam",
	"TCELL": "Turkcell",
	"TTKOM": "Türk Telekom",
	"EREGL": "Ereğli Demir Çelik",
	"KRDMD": "Kardemir",
	"ASELS": "Aselsan",
	"TUPRS": "Tüpraş",
	"PETKM": "Petkim",
	"SAHOL": "Sabancı Holding",
	"KCHOL": "Koç Holding",
	"BIMAS": "BİM",
	"MGROS": "Migros",
	"ARCLK": "Arçelik",
	"FROTO": "Ford Otosan",
	"TOASO": "Tofaş",
	"SASA":  "Sasa Polyester",
	"TAVHL": "TAV Havalimanları",
	"PGSUS": "Pegasus",
	"EKGYO": "Emlak Konut GYO",
	"ENKAI": "Enka İnşaat",
	"KOZAL": "Koza Altın",
	"KOZAA": "Koza Anadolu",
	"DOHOL": "Doğan Holding",
}

// Quote holds the current market data for a symbol.
type Quote struct {
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	Exchange      string  `json:"exchange"`
	Price         float64 `json:"price"`
	PrevClose     float64 `json:"previousClose"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercent"`
	Open          float64 `json:"open"`
	DayHigh       float64 `json:"high"`
	DayLow        float64 `json:"low"`
	Volume        int64   `json:"volume"`
	MarketCap     int64   `json:"marketCap"`
	Week52High    float64 `json:"week52High"`
	Week52Low     float64 `json:"week52Low"`
	LastUpdated   string  `json:"lastUpdated"`
}

// HistoryPoint is one OHLCV bar.
type HistoryPoint struct {
	Date     string  `json:"date"`
	Open     float64 `json:"open"`
	High     float64 `json:"high"`
	Low      float64 `json:"low"`
	Close    float64 `json:"close"`
	Volume   int64   `json:"volume"`
	AdjClose float64 `json:"adjustedClose"`
}

// History is the full historical dataset for a symbol.
type History struct {
	Symbol   string         `json:"symbol"`
	Interval string         `json:"interval"`
	Data     []HistoryPoint `json:"data"`
}

// SearchResult is one item from the stock search.
type SearchResult struct {
	Symbol   string  `json:"symbol"`
	Name     string  `json:"name"`
	Exchange string  `json:"exchange"`
	Type     string  `json:"type"`
	Sector   *string `json:"sector,omitempty"`
}

// toYahooSymbol adds the .IS suffix for BIST stocks.
func toYahooSymbol(sym string) string {
	sym = strings.ToUpper(strings.TrimSpace(sym))
	if _, ok := bistSymbols[sym]; ok && !strings.HasSuffix(sym, ".IS") {
		return sym + ".IS"
	}
	return sym
}

// ── Yahoo Finance API response types ────────────────────────────────────────

type chartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Symbol               string  `json:"symbol"`
				ShortName            string  `json:"shortName"`
				LongName             string  `json:"longName"`
				ExchangeName         string  `json:"fullExchangeName"`
				Currency             string  `json:"currency"`
				RegularMarketPrice   float64 `json:"regularMarketPrice"`
				ChartPreviousClose   float64 `json:"chartPreviousClose"`
				RegularMarketOpen    float64 `json:"regularMarketOpen"`
				RegularMarketDayHigh float64 `json:"regularMarketDayHigh"`
				RegularMarketDayLow  float64 `json:"regularMarketDayLow"`
				RegularMarketVolume  int64   `json:"regularMarketVolume"`
				FiftyTwoWeekHigh     float64 `json:"fiftyTwoWeekHigh"`
				FiftyTwoWeekLow      float64 `json:"fiftyTwoWeekLow"`
			} `json:"meta"`
			Timestamps []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Open   []float64 `json:"open"`
					High   []float64 `json:"high"`
					Low    []float64 `json:"low"`
					Close  []float64 `json:"close"`
					Volume []int64   `json:"volume"`
				} `json:"quote"`
				AdjClose []struct {
					AdjClose []float64 `json:"adjclose"`
				} `json:"adjclose"`
			} `json:"indicators"`
		} `json:"result"`
		Error *struct {
			Code        string `json:"code"`
			Description string `json:"description"`
		} `json:"error"`
	} `json:"chart"`
}

type searchResponse struct {
	Quotes []struct {
		Symbol    string `json:"symbol"`
		ShortName string `json:"shortname"`
		LongName  string `json:"longname"`
		Exchange  string `json:"exchange"`
		QuoteType string `json:"quoteType"`
	} `json:"quotes"`
}

type quoteResponse struct {
	QuoteResponse struct {
		Result []struct {
			Symbol    string `json:"symbol"`
			MarketCap int64  `json:"marketCap"`
		} `json:"result"`
		Error *struct {
			Code        string `json:"code"`
			Description string `json:"description"`
		} `json:"error"`
	} `json:"quoteResponse"`
}

// ── Public API ────────────────────────────────────────────────────────────

// GetQuote fetches the latest quote for a symbol.
func GetQuote(symbol string) (*Quote, error) {
	yahoSym := toYahooSymbol(symbol)
	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1d&includePrePost=false",
		url.PathEscape(yahoSym),
	)
	resp, err := fetch(u)
	if err != nil {
		return nil, err
	}

	var cr chartResponse
	if err := json.Unmarshal(resp, &cr); err != nil {
		return nil, err
	}
	if cr.Chart.Error != nil {
		return nil, fmt.Errorf("yahoo: %s", cr.Chart.Error.Description)
	}
	if len(cr.Chart.Result) == 0 {
		return nil, fmt.Errorf("no data for %s", symbol)
	}

	m := cr.Chart.Result[0].Meta
	name := m.ShortName
	if name == "" {
		name = m.LongName
	}
	if name == "" {
		if n, ok := bistSymbols[strings.ToUpper(symbol)]; ok {
			name = n
		}
	}

	prevClose := m.ChartPreviousClose
	price := m.RegularMarketPrice
	change := 0.0
	changePct := 0.0
	if prevClose > 0 {
		change = round4(price - prevClose)
		changePct = round4((price - prevClose) / prevClose * 100)
	}

	return &Quote{
		Symbol:        strings.ToUpper(symbol),
		Name:          name,
		Exchange:      m.ExchangeName,
		Price:         price,
		PrevClose:     prevClose,
		Change:        change,
		ChangePercent: changePct,
		Open:          m.RegularMarketOpen,
		DayHigh:       m.RegularMarketDayHigh,
		DayLow:        m.RegularMarketDayLow,
		Volume:        m.RegularMarketVolume,
		MarketCap:     0,
		Week52High:    m.FiftyTwoWeekHigh,
		Week52Low:     m.FiftyTwoWeekLow,
		LastUpdated:   time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// GetHistory fetches OHLCV data for a date range.
func GetHistory(symbol, from, to, interval string) (*History, error) {
	yahoSym := toYahooSymbol(symbol)

	fromT, err := time.Parse("2006-01-02", from)
	if err != nil {
		return nil, fmt.Errorf("invalid from date: %w", err)
	}
	toT, err := time.Parse("2006-01-02", to)
	if err != nil {
		return nil, fmt.Errorf("invalid to date: %w", err)
	}
	toT = toT.Add(24 * time.Hour) // include the to date

	intraday := false
	yahoInterval := "1d"
	switch interval {
	case "1h", "60m":
		yahoInterval = "1h"
		intraday = true
	case "30m":
		yahoInterval = "30m"
		intraday = true
	case "1wk":
		yahoInterval = "1wk"
	case "1mo":
		yahoInterval = "1mo"
	}

	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=%s&period1=%d&period2=%d",
		url.PathEscape(yahoSym), yahoInterval, fromT.Unix(), toT.Unix(),
	)
	resp, err := fetch(u)
	if err != nil {
		return nil, err
	}

	var cr chartResponse
	if err := json.Unmarshal(resp, &cr); err != nil {
		return nil, err
	}
	if cr.Chart.Error != nil {
		return nil, fmt.Errorf("yahoo: %s", cr.Chart.Error.Description)
	}
	if len(cr.Chart.Result) == 0 || len(cr.Chart.Result[0].Timestamps) == 0 {
		return nil, fmt.Errorf("no history for %s", symbol)
	}

	result := cr.Chart.Result[0]
	quotes := result.Indicators.Quote
	if len(quotes) == 0 {
		return nil, fmt.Errorf("no quote data for %s", symbol)
	}
	q := quotes[0]

	var adjCloses []float64
	if len(result.Indicators.AdjClose) > 0 {
		adjCloses = result.Indicators.AdjClose[0].AdjClose
	}

	points := make([]HistoryPoint, 0, len(result.Timestamps))
	for i, ts := range result.Timestamps {
		if i >= len(q.Close) || q.Close[i] == 0 {
			continue
		}
		dt := time.Unix(ts, 0).UTC()
		adj := q.Close[i]
		if i < len(adjCloses) && adjCloses[i] != 0 {
			adj = adjCloses[i]
		}
		dateFmt := "2006-01-02"
		if intraday {
			dateFmt = "2006-01-02T15:04:05Z"
		}
		points = append(points, HistoryPoint{
			Date:     dt.Format(dateFmt),
			Open:     round4(safeGet(q.Open, i)),
			High:     round4(safeGet(q.High, i)),
			Low:      round4(safeGet(q.Low, i)),
			Close:    round4(q.Close[i]),
			Volume:   safeGetInt(q.Volume, i),
			AdjClose: round4(adj),
		})
	}

	return &History{
		Symbol:   strings.ToUpper(symbol),
		Interval: interval,
		Data:     points,
	}, nil
}

// Search finds stocks matching a query string.
func Search(query string) ([]SearchResult, error) {
	q := strings.ToUpper(strings.TrimSpace(query))
	var results []SearchResult

	// Search local BIST symbols first
	for sym, name := range bistSymbols {
		if strings.Contains(sym, q) || strings.Contains(strings.ToUpper(name), q) {
			results = append(results, SearchResult{
				Symbol:   sym,
				Name:     name,
				Exchange: "BIST",
				Type:     "Stock",
			})
		}
	}

	// Supplement with Yahoo Finance search
	if len(results) < 8 {
		u := fmt.Sprintf(
			"https://query1.finance.yahoo.com/v1/finance/search?q=%s&quotesCount=8&newsCount=0&listsCount=0",
			url.QueryEscape(query),
		)
		b, err := fetch(u)
		if err == nil {
			var sr searchResponse
			if json.Unmarshal(b, &sr) == nil {
				for _, r := range sr.Quotes {
					// Skip duplicates already in BIST list
					bare := strings.TrimSuffix(r.Symbol, ".IS")
					if _, ok := bistSymbols[bare]; ok {
						continue
					}
					name := r.ShortName
					if name == "" {
						name = r.LongName
					}
					results = append(results, SearchResult{
						Symbol:   r.Symbol,
						Name:     name,
						Exchange: r.Exchange,
						Type:     r.QuoteType,
					})
				}
			}
		}
	}

	// Limit to 10
	if len(results) > 10 {
		results = results[:10]
	}
	return results, nil
}

// GetMarketCaps fetches market cap values in a single batch quote request.
func GetMarketCaps(symbols []string) (map[string]int64, error) {
	yahooToInput := make(map[string]string, len(symbols))
	yahooSymbols := make([]string, 0, len(symbols))
	for _, symbol := range symbols {
		canonical := strings.ToUpper(strings.TrimSpace(symbol))
		if canonical == "" {
			continue
		}

		yahooSymbol := toYahooSymbol(canonical)
		if _, exists := yahooToInput[yahooSymbol]; exists {
			continue
		}

		yahooToInput[yahooSymbol] = canonical
		yahooSymbols = append(yahooSymbols, yahooSymbol)
	}

	if len(yahooSymbols) == 0 {
		return map[string]int64{}, nil
	}

	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s",
		url.QueryEscape(strings.Join(yahooSymbols, ",")),
	)
	resp, err := fetch(u)
	if err != nil {
		return nil, err
	}

	var qr quoteResponse
	if err := json.Unmarshal(resp, &qr); err != nil {
		return nil, err
	}
	if qr.QuoteResponse.Error != nil {
		return nil, fmt.Errorf("yahoo: %s", qr.QuoteResponse.Error.Description)
	}

	marketCaps := make(map[string]int64, len(yahooToInput))
	for _, result := range qr.QuoteResponse.Result {
		if inputSymbol, ok := yahooToInput[strings.ToUpper(result.Symbol)]; ok {
			marketCaps[inputSymbol] = result.MarketCap
		}
	}

	return marketCaps, nil
}

// ── Helpers ──────────────────────────────────────────────────────────────

func fetch(u string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	// Mimic a real browser to avoid 429s
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; keskealsaydim/1.0)")
	req.Header.Set("Accept", "application/json")
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("yahoo API returned %d", resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

func safeGet(s []float64, i int) float64 {
	if i < len(s) {
		return s[i]
	}
	return 0
}

func safeGetInt(s []int64, i int) int64 {
	if i < len(s) {
		return s[i]
	}
	return 0
}

func round4(v float64) float64 {
	return float64(int64(v*10000)) / 10000
}
