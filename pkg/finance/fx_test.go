package finance

import (
	"math"
	"testing"
)

func TestSupportedCurrency(t *testing.T) {
	cases := map[string]bool{
		"":    true, // empty is treated as the base currency
		"TRY": true,
		"USD": true,
		"EUR": true,
		"GBX": true, // pence, derived from GBP
		"XYZ": false,
	}

	for code, want := range cases {
		if got := SupportedCurrency(code); got != want {
			t.Errorf("SupportedCurrency(%q) = %v, want %v", code, got, want)
		}
	}
}

func TestConstantRateSeriesAppliesOneRate(t *testing.T) {
	series := ConstantRateSeries(1)
	for _, date := range []string{"2020-01-01", "2026-08-17", ""} {
		if got := series.On(date); got != 1 {
			t.Errorf("On(%q) = %v, want 1", date, got)
		}
	}
}

func newTestSeries() *RateSeries {
	return &RateSeries{
		currency: "USD",
		byDate:   map[string]float64{"2026-01-05": 30, "2026-01-06": 31, "2026-01-09": 33},
		dates:    []string{"2026-01-05", "2026-01-06", "2026-01-09"},
		fallback: 33,
	}
}

func TestRateSeriesOnExactDate(t *testing.T) {
	if got := newTestSeries().On("2026-01-06"); got != 31 {
		t.Fatalf("expected 31 on an exact match, got %v", got)
	}
}

func TestRateSeriesCarriesLastRateAcrossClosedDays(t *testing.T) {
	// The 7th and 8th are a weekend: the rate from the 6th still applies.
	if got := newTestSeries().On("2026-01-08"); got != 31 {
		t.Fatalf("expected the 6 Jan rate (31) to carry forward, got %v", got)
	}
}

func TestRateSeriesFallsBackToFirstKnownRate(t *testing.T) {
	// A date before the series starts should not produce a 1:1 rate, which
	// would silently value a USD position as if it were lira.
	if got := newTestSeries().On("2025-12-01"); got != 30 {
		t.Fatalf("expected the first known rate (30), got %v", got)
	}
}

func TestRateSeriesHandlesTimestampedDates(t *testing.T) {
	if got := newTestSeries().On("2026-01-06T13:30:00Z"); got != 31 {
		t.Fatalf("expected the date portion to be used, got %v", got)
	}
}

func TestRateSeriesScaledConvertsMinorUnits(t *testing.T) {
	scaled := newTestSeries().scaled(1.0 / 100)
	if got := scaled.On("2026-01-06"); math.Abs(got-0.31) > 1e-9 {
		t.Fatalf("expected 0.31 after dividing by 100, got %v", got)
	}
}

func TestNilRateSeriesIsNeutral(t *testing.T) {
	var series *RateSeries
	if got := series.On("2026-01-06"); got != 1 {
		t.Fatalf("expected a nil series to be neutral, got %v", got)
	}
}
