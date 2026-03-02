package handler

import (
	"net/http"
	"sync"
	"time"

	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

// Well-known symbols for the market overview panel.
// BIST100 index, major currencies vs TRY, and gold.
var overviewSymbols = []string{
	"XU100.IS", // BIST 100
	"USDTRY=X", // USD/TRY
	"EURTRY=X", // EUR/TRY
	"GBPTRY=X", // GBP/TRY
	"GC=F",     // Gold futures
	"THYAO.IS", // Top BIST stocks for market mood
	"GARAN.IS",
	"AKBNK.IS",
	"EREGL.IS",
	"KCHOL.IS",
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		respond.MethodNotAllowed(w)
		return
	}

	const cacheKey = "market:overview"
	var cached []finance.Quote
	if found, _ := cache.Get(cacheKey, &cached); found {
		respond.JSON(w, http.StatusOK, map[string]any{"quotes": cached})
		return
	}

	quotes := fetchAll(overviewSymbols)

	_ = cache.Set(cacheKey, quotes, 2*time.Minute)
	respond.JSON(w, http.StatusOK, map[string]any{"quotes": quotes})
}

// fetchAll fetches quotes for all symbols concurrently, skipping failures.
func fetchAll(symbols []string) []finance.Quote {
	type result struct {
		q   *finance.Quote
		idx int
	}
	ch := make(chan result, len(symbols))
	var wg sync.WaitGroup
	for i, sym := range symbols {
		wg.Add(1)
		go func(idx int, s string) {
			defer wg.Done()
			q, err := finance.GetQuote(s)
			if err == nil {
				ch <- result{q, idx}
			} else {
				ch <- result{nil, idx}
			}
		}(i, sym)
	}
	wg.Wait()
	close(ch)

	out := make([]*finance.Quote, len(symbols))
	for r := range ch {
		out[r.idx] = r.q
	}

	quotes := make([]finance.Quote, 0, len(symbols))
	for _, q := range out {
		if q != nil {
			quotes = append(quotes, *q)
		}
	}
	return quotes
}
