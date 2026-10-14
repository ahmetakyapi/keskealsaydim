package finance

import "testing"

func TestFormatPriceTR(t *testing.T) {
	cases := []struct {
		value    float64
		currency string
		want     string
	}{
		{279.25, "TRY", "₺279,25"},
		{220.58, "usd", "$220,58"},
		{1215.05, "USD", "$1.215,05"},
		{1234567.8, "", "₺1.234.567,80"},
		{0.4567, "TRY", "₺0,4567"},
		{12.3, "CHF", "12,30 CHF"},
		{-5.5, "TRY", "−₺5,50"},
	}

	for _, tc := range cases {
		if got := FormatPriceTR(tc.value, tc.currency); got != tc.want {
			t.Errorf("FormatPriceTR(%v, %q) = %q, want %q", tc.value, tc.currency, got, tc.want)
		}
	}
}
