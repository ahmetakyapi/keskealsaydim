package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/internal/auth"
	"keskealsaydim/internal/db"
	"keskealsaydim/internal/respond"
)

type refreshRequest struct {
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

	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		respond.Error(w, http.StatusBadRequest, "refreshToken gerekli")
		return
	}

	// Validate the JWT signature and expiry
	userID, err := auth.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Geçersiz veya süresi dolmuş token")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx := context.Background()

	// Find the active session and verify it exists in DB
	var sessionID uuid.UUID
	var email string
	err = pool.QueryRow(ctx,
		`SELECT s.id, u.email
		   FROM user_sessions s
		   JOIN users u ON u.id = s.user_id
		  WHERE s.refresh_token = $1
		    AND s.revoked_at IS NULL
		    AND s.expires_at > NOW()
		    AND u.is_active = true`,
		req.RefreshToken,
	).Scan(&sessionID, &email)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Geçersiz veya süresi dolmuş token")
		return
	}

	// Revoke old session (token rotation)
	_, _ = pool.Exec(ctx,
		"UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1",
		sessionID,
	)

	// Issue new token pair
	newAccess, _ := auth.GenerateAccessToken(userID, email)
	newRefresh, _ := auth.GenerateRefreshToken(userID)

	// Persist new session
	_, _ = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, newRefresh, time.Now().Add(auth.RefreshTokenTTL),
	)

	respond.JSON(w, http.StatusOK, map[string]any{
		"accessToken":  newAccess,
		"refreshToken": newRefresh,
		"tokenType":    "Bearer",
		"expiresIn":    int64(auth.AccessTokenTTL.Seconds()),
	})
}
