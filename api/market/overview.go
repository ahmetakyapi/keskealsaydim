package handler

import (
	"net/http"
	"sync"
	"time"

	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

// maxConcurrentQuotes keeps the burst small enough that Yahoo does not answer
// the whole batch with 429s; 38 simultaneous requests reliably tripped it.
const maxConcurrentQuotes = 8

// Category groups the overview so the UI can offer real tabs instead of one
// undifferentiated list.
type Category string

const (
	CategoryIndex     Category = "INDEX"
	CategoryCurrency  Category = "CURRENCY"
	CategoryCommodity Category = "COMMODITY"
	CategoryBIST      Category = "BIST"
	CategoryUS        Category = "US"
)

type symbolSpec struct {
	symbol   string
	category Category
}

// overviewSymbols covers all dashboard sections in one concurrent Go fetch.
var overviewSymbols = []symbolSpec{
	{"XU100.IS", CategoryIndex},
	{"XU030.IS", CategoryIndex},
	{"^GSPC", CategoryIndex},
	{"^IXIC", CategoryIndex},

	{"USDTRY=X", CategoryCurrency},
	{"EURTRY=X", CategoryCurrency},
	{"GBPTRY=X", CategoryCurrency},

	{"GC=F", CategoryCommodity},
	{"SI=F", CategoryCommodity},
	{"BZ=F", CategoryCommodity},

	{"AKBNK.IS", CategoryBIST}, {"ASELS.IS", CategoryBIST}, {"BIMAS.IS", CategoryBIST},
	{"EREGL.IS", CategoryBIST}, {"FROTO.IS", CategoryBIST}, {"GARAN.IS", CategoryBIST},
	{"KCHOL.IS", CategoryBIST}, {"THYAO.IS", CategoryBIST}, {"TUPRS.IS", CategoryBIST},
	{"YKBNK.IS", CategoryBIST}, {"CCOLA.IS", CategoryBIST}, {"ENKAI.IS", CategoryBIST},
	{"ISCTR.IS", CategoryBIST}, {"PETKM.IS", CategoryBIST}, {"SAHOL.IS", CategoryBIST},
	{"SISE.IS", CategoryBIST}, {"TCELL.IS", CategoryBIST}, {"TTKOM.IS", CategoryBIST},

	{"AAPL", CategoryUS}, {"MSFT", CategoryUS}, {"NVDA", CategoryUS},
	{"AMZN", CategoryUS}, {"GOOGL", CategoryUS}, {"META", CategoryUS},
	{"TSLA", CategoryUS}, {"NFLX", CategoryUS}, {"AMD", CategoryUS},
	{"AVGO", CategoryUS}, {"BRK-B", CategoryUS}, {"TSM", CategoryUS},
	{"JPM", CategoryUS}, {"LLY", CategoryUS}, {"V", CategoryUS},
}

// quote is the wire shape: a finance.Quote plus the grouping the UI needs.
type quote struct {
	finance.Quote
	Category Category `json:"category"`
}

type overviewPayload struct {
	Quotes      []quote `json:"quotes"`
	FetchedAt   string  `json:"fetchedAt"`
	Requested   int     `json:"requestedSymbols"`
	Resolved    int     `json:"resolvedSymbols"`
	Partial     bool    `json:"partial"`
	USDTRY      float64 `json:"usdTry"`
	MarketState string  `json:"marketState"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		respond.MethodNotAllowed(w)
		return
	}

	const cacheKey = "market:overview:v2"
	var cached overviewPayload
	if found, _ := cache.Get(cacheKey, &cached); found && len(cached.Quotes) > 0 {
		respond.JSON(w, http.StatusOK, cached)
		return
	}

	payload := fetchAll(overviewSymbols)

	// Caching an empty result would serve "the market is flat" for two minutes
	// every time Yahoo has a blip, which reads as real data to the user.
	if len(payload.Quotes) == 0 {
		respond.Error(w, http.StatusServiceUnavailable,
			"Piyasa verisi şu anda alınamıyor, lütfen birazdan tekrar deneyin")
		return
	}

	ttl := 2 * time.Minute
	if payload.Partial {
		// Half a snapshot should not stick around as long as a full one.
		ttl = 30 * time.Second
	}
	if err := cache.Set(cacheKey, payload, ttl); err != nil {
		respond.LogError("market/overview", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, payload)
}

func fetchAll(specs []symbolSpec) overviewPayload {
	type result struct {
		q   *finance.Quote
		idx int
	}

	results := make([]*finance.Quote, len(specs))
	sem := make(chan struct{}, maxConcurrentQuotes)

	var (
		mu sync.Mutex
		wg sync.WaitGroup
	)
	for i, spec := range specs {
		wg.Add(1)
		go func(idx int, s string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			q, err := finance.GetQuoteWithTimeout(s, 8*time.Second)
			if err != nil {
				respond.LogError("market/overview", "fetch quote "+s, err)
				return
			}
			mu.Lock()
			results[idx] = q
			mu.Unlock()
		}(i, spec.symbol)
	}
	wg.Wait()

	quotes := make([]quote, 0, len(specs))
	symbolsForCaps := make([]string, 0, len(specs))
	usdTry := 0.0
	for i, q := range results {
		if q == nil {
			continue
		}
		quotes = append(quotes, quote{Quote: *q, Category: specs[i].category})
		if specs[i].category == CategoryBIST || specs[i].category == CategoryUS {
			symbolsForCaps = append(symbolsForCaps, q.Symbol)
		}
		if q.Symbol == "USDTRY=X" {
			usdTry = q.Price
		}
	}

	if len(symbolsForCaps) > 0 {
		if marketCaps, err := finance.GetMarketCaps(symbolsForCaps); err == nil {
			for i := range quotes {
				if marketCap, ok := marketCaps[quotes[i].Symbol]; ok {
					quotes[i].MarketCap = marketCap
				}
			}
		} else {
			respond.LogError("market/overview", "market caps", err)
		}
	}

	return overviewPayload{
		Quotes:      quotes,
		FetchedAt:   time.Now().UTC().Format(time.RFC3339),
		Requested:   len(specs),
		Resolved:    len(quotes),
		Partial:     len(quotes) < len(specs),
		USDTRY:      usdTry,
		MarketState: bistSessionState(time.Now()),
	}
}

// bistSessionState reports whether Borsa İstanbul is trading right now, so the
// UI can stop claiming "canlı" outside session hours.
func bistSessionState(now time.Time) string {
	loc, err := time.LoadLocation("Europe/Istanbul")
	if err != nil {
		// Vercel's Go runtime ships tzdata, but fall back rather than guess.
		return "UNKNOWN"
	}
	local := now.In(loc)

	switch local.Weekday() {
	case time.Saturday, time.Sunday:
		return "CLOSED"
	}

	minutes := local.Hour()*60 + local.Minute()
	const (
		openMinutes  = 10 * 60
		closeMinutes = 18*60 + 10
	)
	if minutes >= openMinutes && minutes <= closeMinutes {
		return "OPEN"
	}
	return "CLOSED"
}
