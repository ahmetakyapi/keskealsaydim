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

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.MethodNotAllowed(w)
		return
	}

	switch r.URL.Query().Get("action") {
	case "login":
		handleLogin(w, r)
	case "register":
		handleRegister(w, r)
	case "refresh":
		handleRefresh(w, r)
	case "logout":
		handleLogout(w, r)
	default:
		respond.Error(w, http.StatusBadRequest, "Geçersiz action parametresi")
	}
}

// --- LOGIN ---

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
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

	_, _ = pool.Exec(ctx, "UPDATE users SET last_login_at = NOW() WHERE id = $1", userID)

	accessToken, _ := auth.GenerateAccessToken(userID, email)
	refreshToken, _ := auth.GenerateRefreshToken(userID)

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

// --- REGISTER ---

type registerRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ExperienceLevel string `json:"experienceLevel"`
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
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

	_, _ = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, refreshToken, time.Now().Add(auth.RefreshTokenTTL),
	)

	respond.JSON(w, http.StatusCreated, map[string]any{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"tokenType":    "Bearer",
		"expiresIn":    int64(auth.AccessTokenTTL.Seconds()),
		"user": map[string]any{
			"id":                userID,
			"email":             req.Email,
			"name":              req.Name,
			"experienceLevel":   req.ExperienceLevel,
			"emailVerified":     false,
			"preferredCurrency": "TRY",
			"theme":             "dark",
			"createdAt":         createdAt,
		},
	})
}

// --- REFRESH ---

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		respond.Error(w, http.StatusBadRequest, "refreshToken gerekli")
		return
	}

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

	_, _ = pool.Exec(ctx,
		"UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1",
		sessionID,
	)

	newAccess, _ := auth.GenerateAccessToken(userID, email)
	newRefresh, _ := auth.GenerateRefreshToken(userID)

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

// --- LOGOUT ---

type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
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
