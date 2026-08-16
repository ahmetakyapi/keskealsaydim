package handler

import (
	"net/http"
	"strings"
	"time"

	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

const (
	minSearchLength = 2
	maxSearchLength = 40
	quoteTTL        = time.Minute
	searchTTL       = 10 * time.Minute
	dailyHistoryTTL = 6 * time.Hour
	// Intraday bars go stale within the session, so they cannot share the
	// daily TTL or a 30-minute candle would freeze for a whole day.
	intradayHistoryTTL = 5 * time.Minute
)

var allowedIntervals = map[string]bool{
	"30m": true, "1h": true, "1d": true, "1wk": true, "1mo": true,
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		respond.MethodNotAllowed(w)
		return
	}

	switch r.URL.Query().Get("action") {
	case "search":
		handleSearch(w, r)
	case "price":
		handlePrice(w, r)
	case "history":
		handleHistory(w, r)
	default:
		respond.Error(w, http.StatusBadRequest, "Geçersiz action parametresi")
	}
}

// --- SEARCH ---

func handleSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len([]rune(q)) < minSearchLength {
		respond.Error(w, http.StatusBadRequest, "En az 2 karakter girin")
		return
	}
	if len([]rune(q)) > maxSearchLength {
		q = string([]rune(q)[:maxSearchLength])
	}

	cacheKey := "search:" + strings.ToLower(q)
	var cached []finance.SearchResult
	if found, _ := cache.Get(cacheKey, &cached); found {
		respond.JSON(w, http.StatusOK, cached)
		return
	}

	results, err := finance.Search(q)
	if err != nil {
		respond.LogError("stocks/search", "finance search", err)
		respond.Error(w, http.StatusBadGateway, "Arama şu anda yapılamıyor")
		return
	}

	if len(results) > 0 {
		if err := cache.Set(cacheKey, results, searchTTL); err != nil {
			respond.LogError("stocks/search", "cache set", err)
		}
	}

	respond.JSON(w, http.StatusOK, results)
}

// --- PRICE ---

func handlePrice(w http.ResponseWriter, r *http.Request) {
	symbol := finance.NormalizeStoredSymbol(r.URL.Query().Get("symbol"))
	if symbol == "" {
		respond.Error(w, http.StatusBadRequest, "Sembol gerekli")
		return
	}

	cacheKey := "price:" + symbol
	var quote finance.Quote
	if found, _ := cache.Get(cacheKey, &quote); found && quote.Price > 0 {
		respond.JSON(w, http.StatusOK, &quote)
		return
	}

	q, err := finance.GetQuoteWithTimeout(symbol, 8*time.Second)
	if err != nil || q == nil {
		respond.LogError("stocks/price", "get quote for "+symbol, err)
		respond.Error(w, http.StatusNotFound, "Sembol bulunamadı: "+symbol)
		return
	}

	if err := cache.Set(cacheKey, q, quoteTTL); err != nil {
		respond.LogError("stocks/price", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, q)
}

// --- HISTORY ---

func handleHistory(w http.ResponseWriter, r *http.Request) {
	symbol := finance.NormalizeStoredSymbol(r.URL.Query().Get("symbol"))
	if symbol == "" {
		respond.Error(w, http.StatusBadRequest, "Sembol gerekli")
		return
	}

	q := r.URL.Query()
	from := q.Get("from")
	to := q.Get("to")
	interval := q.Get("interval")

	if interval == "" {
		interval = "1d"
	}
	if !allowedIntervals[interval] {
		respond.Error(w, http.StatusBadRequest, "Geçersiz aralık")
		return
	}
	if from == "" {
		from = time.Now().AddDate(-1, 0, 0).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	fromT, err := time.Parse("2006-01-02", from)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz başlangıç tarihi")
		return
	}
	toT, err := time.Parse("2006-01-02", to)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz bitiş tarihi")
		return
	}
	if !fromT.Before(toT) {
		respond.Error(w, http.StatusBadRequest, "Başlangıç tarihi bitiş tarihinden önce olmalı")
		return
	}

	ttl := dailyHistoryTTL
	if interval == "30m" || interval == "1h" {
		ttl = intradayHistoryTTL
	}

	cacheKey := "hist:" + symbol + ":" + from + ":" + to + ":" + interval
	var hist finance.History
	if found, _ := cache.Get(cacheKey, &hist); found && len(hist.Data) > 0 {
		respond.JSON(w, http.StatusOK, &hist)
		return
	}

	h, err := finance.GetHistory(symbol, from, to, interval)
	if err != nil || h == nil || len(h.Data) == 0 {
		respond.LogError("stocks/history", "get history for "+symbol, err)
		respond.Error(w, http.StatusNotFound, "Bu aralıkta veri bulunamadı: "+symbol)
		return
	}

	if err := cache.Set(cacheKey, h, ttl); err != nil {
		respond.LogError("stocks/history", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, h)
}
