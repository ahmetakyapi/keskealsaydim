package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"keskealsaydim/internal/auth"
	"keskealsaydim/internal/db"
	"keskealsaydim/internal/respond"
)

type registerRequest struct {
	Name             string `json:"name"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	ExperienceLevel  string `json:"experienceLevel"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.MethodNotAllowed(w)
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" || len(req.Name) < 2 {
		respond.Error(w, http.StatusBadRequest, "Ad en az 2 karakter olmalıdır")
		return
	}
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		respond.Error(w, http.StatusBadRequest, "Geçerli bir e-posta adresi giriniz")
		return
	}
	if len(req.Password) < 6 {
		respond.Error(w, http.StatusBadRequest, "Şifre en az 6 karakter olmalıdır")
		return
	}
	if req.ExperienceLevel == "" {
		req.ExperienceLevel = "BEGINNER"
	}

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx := context.Background()

	// Check email uniqueness
	var exists bool
	_ = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", req.Email).Scan(&exists)
	if exists {
		respond.Error(w, http.StatusConflict, "Bu e-posta adresi zaten kullanılıyor")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Şifre işlenirken hata oluştu")
		return
	}

	userID := uuid.New()
	var createdAt time.Time
	err = pool.QueryRow(ctx,
		`INSERT INTO users (id, email, password_hash, name, experience_level)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING created_at`,
		userID, req.Email, string(hash), req.Name, req.ExperienceLevel,
	).Scan(&createdAt)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Kullanıcı oluşturulamadı")
		return
	}

	accessToken, err := auth.GenerateAccessToken(userID, req.Email)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Token oluşturulamadı")
		return
	}
	refreshToken, err := auth.GenerateRefreshToken(userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Token oluşturulamadı")
		return
	}

	// Persist the session
	sessionID := uuid.New()
	_, _ = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		sessionID, userID, refreshToken, time.Now().Add(auth.RefreshTokenTTL),
	)

	respond.JSON(w, http.StatusCreated, map[string]any{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"tokenType":    "Bearer",
		"expiresIn":    int64(auth.AccessTokenTTL.Seconds()),
		"user": map[string]any{
			"id":              userID,
			"email":           req.Email,
			"name":            req.Name,
			"experienceLevel": req.ExperienceLevel,
			"emailVerified":   false,
			"preferredCurrency": "TRY",
			"theme":           "dark",
			"createdAt":       createdAt,
		},
	})
}
