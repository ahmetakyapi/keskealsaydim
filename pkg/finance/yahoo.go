// Package finance provides a Yahoo Finance HTTP client.
// Directly calls the undocumented but stable v8 chart API.
package finance

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
)

// A cookie jar is required: Yahoo's v7 endpoints only accept a crumb that was
// minted for the session cookie sent alongside it.
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
	Jar:     newCookieJar(),
}

func newCookieJar() http.CookieJar {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil
	}
	return jar
}

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
	Currency      string  `json:"currency"`
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
	Currency string         `json:"currency"`
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

type chartMeta struct {
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
}

type chartResult struct {
	Meta       chartMeta `json:"meta"`
	Timestamps []int64   `json:"timestamp"`
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
}

type chartResponse struct {
	Chart struct {
		Result []chartResult `json:"result"`
		Error  *struct {
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

// GetQuoteWithTimeout fetches a quote with a hard deadline. The deadline is
// pushed down into the HTTP request so an abandoned call stops consuming a
// connection instead of running on in a detached goroutine.
func GetQuoteWithTimeout(symbol string, timeout time.Duration) (*Quote, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	q, err := getQuote(ctx, symbol)
	if err != nil && ctx.Err() != nil {
		return nil, fmt.Errorf("timeout fetching quote for %s: %w", symbol, err)
	}
	return q, err
}

// GetQuote fetches the latest quote for a symbol.
func GetQuote(symbol string) (*Quote, error) {
	return getQuote(context.Background(), symbol)
}

func getQuote(ctx context.Context, symbol string) (*Quote, error) {
	yahoSym := toYahooSymbol(symbol)
	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1d&includePrePost=false",
		url.PathEscape(yahoSym),
	)
	resp, err := fetch(ctx, u)
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

	// Yahoo occasionally answers 200 with an empty meta block. Reporting that
	// as a ₺0,00 quote would look like a real price, so treat it as no data.
	if price <= 0 {
		if last := lastClose(cr.Chart.Result[0]); last > 0 {
			price = last
		} else {
			return nil, fmt.Errorf("no price for %s", symbol)
		}
	}

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
		Currency:      normalizeCurrency(m.Currency),
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
	resp, err := fetch(context.Background(), u)
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
		Currency: normalizeCurrency(result.Meta.Currency),
		Data:     points,
	}, nil
}

// normalizeCurrency uppercases the Yahoo currency code and rewrites the
// pence/cent minor units Yahoo reports for some venues. An empty code is
// reported as-is so callers can decide their own fallback.
func normalizeCurrency(code string) string {
	code = strings.ToUpper(strings.TrimSpace(code))
	switch code {
	case "GBP":
		return "GBP"
	case "GBX", "GBP.": // London pence
		return "GBX"
	default:
		return code
	}
}

// Search finds stocks matching a query string. It always returns a non-nil
// slice so callers can serialise `[]` instead of `null`.
func Search(query string) ([]SearchResult, error) {
	// Turkish dotted/dotless I makes naive upper-casing miss obvious matches:
	// "iş bankası" upper-cases to "IŞ BANKASI" but the stored name is
	// "İŞ BANKASI". Folding both sides to ASCII sidesteps the whole class.
	needle := foldTurkish(query)
	results := make([]SearchResult, 0, 10)

	if needle != "" {
		for sym, name := range bistSymbols {
			if strings.Contains(foldTurkish(sym), needle) || strings.Contains(foldTurkish(name), needle) {
				results = append(results, SearchResult{
					Symbol:   sym,
					Name:     name,
					Exchange: "BIST",
					Type:     "Stock",
				})
			}
		}
		// Map iteration order is random; keep the list stable between calls.
		sort.Slice(results, func(i, j int) bool {
			iExact := strings.HasPrefix(foldTurkish(results[i].Symbol), needle)
			jExact := strings.HasPrefix(foldTurkish(results[j].Symbol), needle)
			if iExact != jExact {
				return iExact
			}
			return results[i].Symbol < results[j].Symbol
		})
	}

	// Supplement with Yahoo Finance search
	if len(results) < 8 && strings.TrimSpace(query) != "" {
		u := fmt.Sprintf(
			"https://query1.finance.yahoo.com/v1/finance/search?q=%s&quotesCount=8&newsCount=0&listsCount=0",
			url.QueryEscape(query),
		)
		ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
		defer cancel()

		if b, err := fetch(ctx, u); err == nil {
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

	if len(results) > 10 {
		results = results[:10]
	}
	return results, nil
}

// IsKnownSymbol reports whether a symbol resolves to a tradable instrument.
// Used before persisting a symbol so typos cannot become permanent dead rows.
func IsKnownSymbol(symbol string) (*Quote, bool) {
	symbol = NormalizeStoredSymbol(symbol)
	if symbol == "" {
		return nil, false
	}
	q, err := GetQuoteWithTimeout(symbol, 6*time.Second)
	if err != nil || q == nil || q.Price <= 0 {
		return nil, false
	}
	return q, true
}

// foldTurkish lowercases and strips Turkish diacritics so search comparisons
// are insensitive to both case and accents.
func foldTurkish(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range strings.TrimSpace(s) {
		switch r {
		case 'ı', 'I', 'İ', 'i':
			b.WriteRune('I')
		case 'ş', 'Ş':
			b.WriteRune('S')
		case 'ğ', 'Ğ':
			b.WriteRune('G')
		case 'ü', 'Ü':
			b.WriteRune('U')
		case 'ö', 'Ö':
			b.WriteRune('O')
		case 'ç', 'Ç':
			b.WriteRune('C')
		default:
			b.WriteRune(unicode.ToUpper(r))
		}
	}
	return b.String()
}

func lastClose(result chartResult) float64 {
	if len(result.Indicators.Quote) == 0 {
		return 0
	}
	closes := result.Indicators.Quote[0].Close
	for i := len(closes) - 1; i >= 0; i-- {
		if closes[i] > 0 {
			return closes[i]
		}
	}
	return 0
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

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Since 2023 the v7 quote endpoint rejects anonymous calls; it needs the
	// session cookie plus the matching crumb. Without them every call 401s and
	// market caps silently stay at zero.
	crumb, err := getCrumb(ctx)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s&crumb=%s",
		url.QueryEscape(strings.Join(yahooSymbols, ",")),
		url.QueryEscape(crumb),
	)
	resp, err := fetch(ctx, u)
	if err != nil {
		// A stale crumb looks like an auth failure; drop it so the next call
		// mints a fresh one instead of failing forever.
		invalidateCrumb()
		return nil, err
	}

	var qr quoteResponse
	if err := json.Unmarshal(resp, &qr); err != nil {
		return nil, err
	}
	if qr.QuoteResponse.Error != nil {
		invalidateCrumb()
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

func fetch(ctx context.Context, u string) ([]byte, error) {
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		if err := ctx.Err(); err != nil {
			if lastErr != nil {
				return nil, lastErr
			}
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return nil, err
		}
		// Mimic a real browser to avoid 429s.
		req.Header.Set("User-Agent", browserUserAgent)
		req.Header.Set("Accept", "application/json")

		resp, err := httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < 3 && ctx.Err() == nil {
				sleepCtx(ctx, backoffFor(attempt))
				continue
			}
			return nil, err
		}

		payload, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			if attempt < 3 && ctx.Err() == nil {
				sleepCtx(ctx, backoffFor(attempt))
				continue
			}
			return nil, readErr
		}

		if resp.StatusCode == http.StatusOK {
			return payload, nil
		}

		lastErr = fmt.Errorf("yahoo API returned %d", resp.StatusCode)
		if attempt < 3 && isRetryableYahooStatus(resp.StatusCode) && ctx.Err() == nil {
			sleepCtx(ctx, backoffFor(attempt))
			continue
		}

		return nil, lastErr
	}

	return nil, lastErr
}

// backoffFor grows fast enough that a rate-limited burst actually backs off
// instead of hammering Yahoo three times inside a second.
func backoffFor(attempt int) time.Duration {
	return time.Duration(1<<uint(attempt-1)) * 400 * time.Millisecond
}

func sleepCtx(ctx context.Context, d time.Duration) {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}

// ── Yahoo crumb/cookie session ─────────────────────────────────────────────

const browserUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"

var (
	crumbMu      sync.Mutex
	cachedCrumb  string
	crumbFetched time.Time
)

const crumbTTL = 30 * time.Minute

func invalidateCrumb() {
	crumbMu.Lock()
	cachedCrumb = ""
	crumbMu.Unlock()
}

// getCrumb establishes a Yahoo session (cookie) and exchanges it for the crumb
// the v7 endpoints require, caching the pair for the life of the instance.
func getCrumb(ctx context.Context) (string, error) {
	crumbMu.Lock()
	defer crumbMu.Unlock()

	if cachedCrumb != "" && time.Since(crumbFetched) < crumbTTL {
		return cachedCrumb, nil
	}

	// Step 1: pick up the consent cookie.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://fc.yahoo.com/", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", browserUserAgent)
	if resp, err := httpClient.Do(req); err == nil {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}

	// Step 2: exchange it for a crumb.
	req, err = http.NewRequestWithContext(ctx, http.MethodGet,
		"https://query1.finance.yahoo.com/v1/test/getcrumb", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", browserUserAgent)
	req.Header.Set("Accept", "*/*")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	crumb := strings.TrimSpace(string(body))
	if resp.StatusCode != http.StatusOK || crumb == "" || strings.Contains(crumb, "<") {
		return "", fmt.Errorf("yahoo crumb unavailable (status %d)", resp.StatusCode)
	}

	cachedCrumb = crumb
	crumbFetched = time.Now()
	return crumb, nil
}

func isRetryableYahooStatus(statusCode int) bool {
	switch statusCode {
	case http.StatusRequestTimeout, http.StatusTooManyRequests, http.StatusBadGateway,
		http.StatusServiceUnavailable, http.StatusGatewayTimeout, http.StatusInternalServerError:
		return true
	default:
		return false
	}
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
	return math.Round(v*10000) / 10000
}
