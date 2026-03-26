package handler

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodDelete {
		respond.MethodNotAllowed(w)
		return
	}

	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	rawID := strings.TrimSpace(r.URL.Query().Get("id"))
	watchID, err := uuid.Parse(rawID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz ID")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM watchlist WHERE id = $1 AND user_id = $2",
		watchID, claims.UserID,
	)
	if err != nil {
		respond.LogError("watchlist/item", "delete watchlist item", err)
		respond.Error(w, http.StatusInternalServerError, "Kayıt silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Kayıt bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
