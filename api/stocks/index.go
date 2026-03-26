package handler

import (
	"net/http"
	"time"

	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

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
	q := r.URL.Query().Get("q")
	if len(q) < 1 {
		respond.Error(w, http.StatusBadRequest, "q parametresi gerekli")
		return
	}

	results, err := finance.Search(q)
	if err != nil {
		respond.LogError("stocks/search", "finance search", err)
		respond.Error(w, http.StatusInternalServerError, "Arama başarısız")
		return
	}

	respond.JSON(w, http.StatusOK, results)
}

// --- PRICE ---

func handlePrice(w http.ResponseWriter, r *http.Request) {
	symbol := finance.NormalizeStoredSymbol(r.URL.Query().Get("symbol"))
	if symbol == "" {
		respond.Error(w, http.StatusBadRequest, "symbol gerekli")
		return
	}

	cacheKey := "price:" + symbol
	var quote finance.Quote
	if found, _ := cache.Get(cacheKey, &quote); found {
		respond.JSON(w, http.StatusOK, &quote)
		return
	}

	q, err := finance.GetQuote(symbol)
	if err != nil {
		respond.LogError("stocks/price", "get quote for "+symbol, err)
		respond.Error(w, http.StatusNotFound, "Sembol bulunamadı: "+symbol)
		return
	}

	if err := cache.Set(cacheKey, q, time.Minute); err != nil {
		respond.LogError("stocks/price", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, q)
}

// --- HISTORY ---

func handleHistory(w http.ResponseWriter, r *http.Request) {
	symbol := finance.NormalizeStoredSymbol(r.URL.Query().Get("symbol"))
	if symbol == "" {
		respond.Error(w, http.StatusBadRequest, "symbol gerekli")
		return
	}

	q := r.URL.Query()
	from := q.Get("from")
	to := q.Get("to")
	interval := q.Get("interval")

	if interval == "" {
		interval = "1d"
	}
	if from == "" {
		from = time.Now().AddDate(-1, 0, 0).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	cacheKey := "hist:" + symbol + ":" + from + ":" + to + ":" + interval
	var hist finance.History
	if found, _ := cache.Get(cacheKey, &hist); found {
		respond.JSON(w, http.StatusOK, &hist)
		return
	}

	h, err := finance.GetHistory(symbol, from, to, interval)
	if err != nil {
		respond.LogError("stocks/history", "get history for "+symbol, err)
		respond.Error(w, http.StatusNotFound, "Geçmiş veri bulunamadı: "+symbol)
		return
	}

	if err := cache.Set(cacheKey, h, 24*time.Hour); err != nil {
		respond.LogError("stocks/history", "cache set", err)
	}
	respond.JSON(w, http.StatusOK, h)
}
