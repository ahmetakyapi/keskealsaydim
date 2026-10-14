package finance

import (
	"math"
	"strconv"
	"strings"
)

var currencySymbols = map[string]string{
	"TRY": "₺",
	"USD": "$",
	"EUR": "€",
	"GBP": "£",
}

// FormatPriceTR writes a price the way the app shows it: Turkish separators
// ("1.215,05"), the currency's symbol in front, four decimals under one unit.
// Server-written text (alert notifications) used to print "220.58", which a
// Turkish reader parses as two hundred and twenty thousand.
func FormatPriceTR(value float64, currency string) string {
	decimals := 2
	if abs := math.Abs(value); abs > 0 && abs < 1 {
		decimals = 4
	}

	raw := strconv.FormatFloat(math.Abs(value), 'f', decimals, 64)
	whole, fraction, _ := strings.Cut(raw, ".")

	var grouped strings.Builder
	for i, digit := range whole {
		if i > 0 && (len(whole)-i)%3 == 0 {
			grouped.WriteByte('.')
		}
		grouped.WriteRune(digit)
	}

	number := grouped.String() + "," + fraction
	if value < 0 {
		number = "−" + number
	}

	code := canonicalCurrency(currency)
	if code == "" {
		code = BaseCurrency
	}
	if symbol, ok := currencySymbols[code]; ok {
		if value < 0 {
			return "−" + symbol + strings.TrimPrefix(number, "−")
		}
		return symbol + number
	}
	return number + " " + code
}
