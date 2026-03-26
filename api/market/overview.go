package handler

import (
	"net/http"
	"sync"
	"time"

	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

// overviewSymbols covers all dashboard sections in one concurrent Go fetch.
var overviewSymbols = []string{
	// Key market indices & currencies
	"XU100.IS", "USDTRY=X", "EURTRY=X", "GBPTRY=X", "GC=F",

	// BIST30 picks
	"AKBNK.IS", "ASELS.IS", "BIMAS.IS", "EREGL.IS", "FROTO.IS",
	"GARAN.IS", "KCHOL.IS", "THYAO.IS", "TUPRS.IS", "YKBNK.IS",

	// BIST100 extras
	"CCOLA.IS", "ENKAI.IS", "ISCTR.IS", "MAVI.IS",
	"PETKM.IS", "SAHOL.IS", "SISE.IS", "TCELL.IS",

	// Nasdaq / US large cap
	"AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
	"META", "TSLA", "NFLX", "AMD", "AVGO",

	// Market cap leaders
	"BRK-B", "TSM", "JPM", "LLY", "V",
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

	if err := cache.Set(cacheKey, quotes, 2*time.Minute); err != nil {
		respond.LogError("market/overview", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, map[string]any{"quotes": quotes})
}

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

	if len(quotes) == 0 {
		return quotes
	}

	symbolsForCaps := make([]string, 0, len(quotes))
	for _, q := range quotes {
		symbolsForCaps = append(symbolsForCaps, q.Symbol)
	}

	if marketCaps, err := finance.GetMarketCaps(symbolsForCaps); err == nil {
		for i := range quotes {
			if marketCap, ok := marketCaps[quotes[i].Symbol]; ok {
				quotes[i].MarketCap = marketCap
			}
		}
	}

	return quotes
}
