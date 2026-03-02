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

	cacheKey := "price:" + symbol
	var quote finance.Quote
	if found, _ := cache.Get(cacheKey, &quote); found {
		respond.JSON(w, http.StatusOK, &quote)
		return
	}

	q, err := finance.GetQuote(symbol)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "Sembol bulunamadı: "+symbol)
		return
	}

	_ = cache.Set(cacheKey, q, time.Minute)
	respond.JSON(w, http.StatusOK, q)
}
