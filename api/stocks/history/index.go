package handler

import (
	"net/http"
	"strings"
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

	symbol := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("symbol")))
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
		respond.Error(w, http.StatusNotFound, "Geçmiş veri bulunamadı: "+symbol)
		return
	}

	_ = cache.Set(cacheKey, h, 24*time.Hour)
	respond.JSON(w, http.StatusOK, h)
}
