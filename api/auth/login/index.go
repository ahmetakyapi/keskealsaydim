package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.MethodNotAllowed(w)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx := context.Background()

	var (
		userID            uuid.UUID
		email, name       string
		passwordHash      string
		experienceLevel   string
		avatarURL         *string
		emailVerified     bool
		isActive          bool
		preferredCurrency string
		theme             string
		createdAt         time.Time
		lastLoginAt       *time.Time
	)

	err = pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, experience_level,
		        avatar_url, email_verified, is_active,
		        preferred_currency, theme, created_at, last_login_at
		 FROM users WHERE email = $1`,
		req.Email,
	).Scan(
		&userID, &email, &passwordHash, &name, &experienceLevel,
		&avatarURL, &emailVerified, &isActive,
		&preferredCurrency, &theme, &createdAt, &lastLoginAt,
	)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "E-posta veya şifre hatalı")
		return
	}

	if !isActive {
		respond.Error(w, http.StatusForbidden, "Hesabınız devre dışı bırakılmış")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respond.Error(w, http.StatusUnauthorized, "E-posta veya şifre hatalı")
		return
	}

	// Update last login
	_, _ = pool.Exec(ctx, "UPDATE users SET last_login_at = NOW() WHERE id = $1", userID)

	accessToken, _ := auth.GenerateAccessToken(userID, email)
	refreshToken, _ := auth.GenerateRefreshToken(userID)

	// Persist session
	_, _ = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, refreshToken, time.Now().Add(auth.RefreshTokenTTL),
	)

	respond.JSON(w, http.StatusOK, map[string]any{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"tokenType":    "Bearer",
		"expiresIn":    int64(auth.AccessTokenTTL.Seconds()),
		"user": map[string]any{
			"id":                userID,
			"email":             email,
			"name":              name,
			"experienceLevel":   experienceLevel,
			"avatarUrl":         avatarURL,
			"emailVerified":     emailVerified,
			"preferredCurrency": preferredCurrency,
			"theme":             theme,
			"createdAt":         createdAt,
			"lastLoginAt":       lastLoginAt,
		},
	})
}
