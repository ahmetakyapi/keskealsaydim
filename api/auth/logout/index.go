package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"keskealsaydim/internal/auth"
	"keskealsaydim/internal/db"
	"keskealsaydim/internal/respond"
)

type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.MethodNotAllowed(w)
		return
	}

	if _, err := auth.FromRequest(r); err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	var req logoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		respond.Error(w, http.StatusBadRequest, "refreshToken gerekli")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	_, _ = pool.Exec(context.Background(),
		"UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token = $1 AND revoked_at IS NULL",
		req.RefreshToken,
	)

	w.WriteHeader(http.StatusNoContent)
}
