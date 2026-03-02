package handler

import (
	"net/http"

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

	q := r.URL.Query().Get("q")
	if len(q) < 1 {
		respond.Error(w, http.StatusBadRequest, "q parametresi gerekli")
		return
	}

	results, err := finance.Search(q)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Arama başarısız")
		return
	}

	respond.JSON(w, http.StatusOK, results)
}
