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
	investID, err := uuid.Parse(rawID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz yatırım ID")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM investments WHERE id = $1 AND user_id = $2",
		investID, claims.UserID,
	)
	if err != nil {
		respond.LogError("portfolio/item", "delete investment", err)
		respond.Error(w, http.StatusInternalServerError, "Yatırım silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Yatırım bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
