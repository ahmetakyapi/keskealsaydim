package finance

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

// BaseCurrency is the currency every monetary total in the app is expressed in.
const BaseCurrency = "TRY"

// fxPairs maps a source currency to the Yahoo symbol quoting it in TRY.
var fxPairs = map[string]string{
	"USD": "USDTRY=X",
	"EUR": "EURTRY=X",
	"GBP": "GBPTRY=X",
	"CHF": "CHFTRY=X",
	"JPY": "JPYTRY=X",
	"CAD": "CADTRY=X",
	"AUD": "AUDTRY=X",
	"SEK": "SEKTRY=X",
	"DKK": "DKKTRY=X",
	"NOK": "NOKTRY=X",
}

// minorUnitDivisor handles quotes reported in a currency's minor unit
// (e.g. London prices come back in pence, not pounds).
var minorUnitDivisor = map[string]struct {
	major   string
	divisor float64
}{
	"GBX": {major: "GBP", divisor: 100},
	"ZAC": {major: "ZAR", divisor: 100},
	"ILA": {major: "ILS", divisor: 100},
}

// SupportedCurrency reports whether a quote in this currency can be converted
// into TRY. Unknown currencies are left unconverted by callers.
func SupportedCurrency(code string) bool {
	code = canonicalCurrency(code)
	if code == "" || code == BaseCurrency {
		return true
	}
	if _, ok := minorUnitDivisor[code]; ok {
		return true
	}
	_, ok := fxPairs[code]
	return ok
}

func canonicalCurrency(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// SpotRateToTRY returns how many Turkish lira one unit of `currency` is worth
// right now. An empty currency is treated as TRY, matching the BIST default.
func SpotRateToTRY(currency string) (float64, error) {
	currency = canonicalCurrency(currency)
	if currency == "" || currency == BaseCurrency {
		return 1, nil
	}

	if minor, ok := minorUnitDivisor[currency]; ok {
		majorRate, err := SpotRateToTRY(minor.major)
		if err != nil {
			return 0, err
		}
		return majorRate / minor.divisor, nil
	}

	pair, ok := fxPairs[currency]
	if !ok {
		return 0, fmt.Errorf("unsupported currency %q", currency)
	}

	q, err := GetQuoteWithTimeout(pair, 6*time.Second)
	if err != nil {
		return 0, err
	}
	if q == nil || q.Price <= 0 {
		return 0, fmt.Errorf("no rate for %s", pair)
	}
	return q.Price, nil
}

// SpotRatesToTRY resolves several currencies concurrently. Currencies that
// cannot be resolved are omitted from the result so callers can decide whether
// to skip the holding or fall back to an unconverted value.
func SpotRatesToTRY(currencies []string) map[string]float64 {
	wanted := make(map[string]bool, len(currencies))
	for _, c := range currencies {
		c = canonicalCurrency(c)
		if c == "" || c == BaseCurrency {
			continue
		}
		wanted[c] = true
	}

	rates := map[string]float64{BaseCurrency: 1}
	if len(wanted) == 0 {
		return rates
	}

	var (
		mu sync.Mutex
		wg sync.WaitGroup
	)
	for currency := range wanted {
		wg.Add(1)
		go func(c string) {
			defer wg.Done()
			rate, err := SpotRateToTRY(c)
			if err != nil || rate <= 0 {
				return
			}
			mu.Lock()
			rates[c] = rate
			mu.Unlock()
		}(currency)
	}
	wg.Wait()

	return rates
}

// RateSeries holds daily FX rates keyed by YYYY-MM-DD, used to convert a
// historical price series into TRY at the rate that applied on each day.
type RateSeries struct {
	currency string
	byDate   map[string]float64
	dates    []string
	fallback float64
}

// Constant returns a RateSeries that applies the same rate to every date.
// Used for TRY-denominated series, where no conversion is needed.
func ConstantRateSeries(rate float64) *RateSeries {
	return &RateSeries{currency: BaseCurrency, fallback: rate}
}

// RateSeriesToTRY loads daily rates for `currency` across the given range.
func RateSeriesToTRY(currency, from, to string) (*RateSeries, error) {
	currency = canonicalCurrency(currency)
	if currency == "" || currency == BaseCurrency {
		return ConstantRateSeries(1), nil
	}

	if minor, ok := minorUnitDivisor[currency]; ok {
		major, err := RateSeriesToTRY(minor.major, from, to)
		if err != nil {
			return nil, err
		}
		return major.scaled(1 / minor.divisor), nil
	}

	pair, ok := fxPairs[currency]
	if !ok {
		return nil, fmt.Errorf("unsupported currency %q", currency)
	}

	hist, err := GetHistory(pair, from, to, "1d")
	if err != nil {
		return nil, err
	}
	if hist == nil || len(hist.Data) == 0 {
		return nil, fmt.Errorf("no rate history for %s", pair)
	}

	series := &RateSeries{
		currency: currency,
		byDate:   make(map[string]float64, len(hist.Data)),
		dates:    make([]string, 0, len(hist.Data)),
	}
	for _, point := range hist.Data {
		if point.Close <= 0 {
			continue
		}
		date := point.Date
		if len(date) > 10 {
			date = date[:10]
		}
		if _, seen := series.byDate[date]; !seen {
			series.dates = append(series.dates, date)
		}
		series.byDate[date] = point.Close
		series.fallback = point.Close
	}
	if len(series.dates) == 0 {
		return nil, fmt.Errorf("no usable rate history for %s", pair)
	}

	return series, nil
}

// NewRateSeriesForTest builds a series from explicit rates. Exported so
// handler tests can pin an exchange rate without reaching the network.
func NewRateSeriesForTest(currency string, byDate map[string]float64) *RateSeries {
	series := &RateSeries{
		currency: canonicalCurrency(currency),
		byDate:   make(map[string]float64, len(byDate)),
		dates:    make([]string, 0, len(byDate)),
	}
	for date, rate := range byDate {
		series.byDate[date] = rate
		series.dates = append(series.dates, date)
	}
	sort.Strings(series.dates)
	if len(series.dates) > 0 {
		series.fallback = series.byDate[series.dates[len(series.dates)-1]]
	}
	return series
}

func (s *RateSeries) scaled(factor float64) *RateSeries {
	out := &RateSeries{
		currency: s.currency,
		fallback: s.fallback * factor,
		dates:    s.dates,
	}
	if s.byDate != nil {
		out.byDate = make(map[string]float64, len(s.byDate))
		for date, rate := range s.byDate {
			out.byDate[date] = rate * factor
		}
	}
	return out
}

// On returns the rate for a date, falling back to the most recent earlier date
// when the market was closed (weekends, holidays) and to the first available
// date when the requested date precedes the series.
func (s *RateSeries) On(date string) float64 {
	if s == nil {
		return 1
	}
	if s.byDate == nil {
		if s.fallback > 0 {
			return s.fallback
		}
		return 1
	}
	if len(date) > 10 {
		date = date[:10]
	}
	if rate, ok := s.byDate[date]; ok {
		return rate
	}

	// Dates arrive sorted ascending from Yahoo; walk back to the last known day.
	best := 0.0
	for _, d := range s.dates {
		if d > date {
			break
		}
		best = s.byDate[d]
	}
	if best > 0 {
		return best
	}
	if len(s.dates) > 0 {
		if first := s.byDate[s.dates[0]]; first > 0 {
			return first
		}
	}
	if s.fallback > 0 {
		return s.fallback
	}
	return 1
}
