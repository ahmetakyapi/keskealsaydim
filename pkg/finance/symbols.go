package finance

import "strings"

// NormalizeStoredSymbol converts supported BIST symbols to a single stored form.
// We keep user-managed BIST symbols without the Yahoo ".IS" suffix so
// watchlist/portfolio/compare data stays consistent across inputs.
func NormalizeStoredSymbol(symbol string) string {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	if symbol == "" {
		return ""
	}

	if bare, ok := normalizeBISTSymbol(symbol); ok {
		return bare
	}

	return symbol
}

// SymbolVariants returns equivalent stored/query variants for duplicate checks.
func SymbolVariants(symbol string) []string {
	canonical := NormalizeStoredSymbol(symbol)
	if canonical == "" {
		return nil
	}

	if _, ok := bistSymbols[canonical]; ok {
		return []string{canonical, canonical + ".IS"}
	}

	return []string{canonical}
}

func normalizeBISTSymbol(symbol string) (string, bool) {
	if strings.HasSuffix(symbol, ".IS") {
		bare := strings.TrimSuffix(symbol, ".IS")
		_, ok := bistSymbols[bare]
		return bare, ok
	}

	_, ok := bistSymbols[symbol]
	return symbol, ok
}
