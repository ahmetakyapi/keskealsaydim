package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/internal/auth"
	"keskealsaydim/internal/db"
	"keskealsaydim/internal/respond"
)

type updateProfileRequest struct {
	Name              string `json:"name"`
	ExperienceLevel   string `json:"experienceLevel"`
	PreferredCurrency string `json:"preferredCurrency"`
	Theme             string `json:"theme"`
}

type userProfile struct {
	ID                uuid.UUID  `json:"id"`
	Email             string     `json:"email"`
	Name              string     `json:"name"`
	ExperienceLevel   string     `json:"experienceLevel"`
	AvatarURL         *string    `json:"avatarUrl"`
	EmailVerified     bool       `json:"emailVerified"`
	IsActive          bool       `json:"isActive"`
	PreferredCurrency string     `json:"preferredCurrency"`
	Theme             string     `json:"theme"`
	CreatedAt         time.Time  `json:"createdAt"`
	LastLoginAt       *time.Time `json:"lastLoginAt"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	switch r.Method {
	case http.MethodGet:
		getProfile(w, claims)
	case http.MethodPut:
		updateProfile(w, r, claims)
	default:
		respond.MethodNotAllowed(w)
	}
}

func getProfile(w http.ResponseWriter, claims *auth.Claims) {
	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	var p userProfile
	err = pool.QueryRow(context.Background(),
		`SELECT id, email, name, experience_level, avatar_url, email_verified,
		        is_active, preferred_currency, theme, created_at, last_login_at
		   FROM users WHERE id = $1`,
		claims.UserID,
	).Scan(
		&p.ID, &p.Email, &p.Name, &p.ExperienceLevel, &p.AvatarURL,
		&p.EmailVerified, &p.IsActive, &p.PreferredCurrency, &p.Theme,
		&p.CreatedAt, &p.LastLoginAt,
	)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "Kullanıcı bulunamadı")
		return
	}

	respond.JSON(w, http.StatusOK, p)
}

func updateProfile(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name != "" && len(req.Name) < 2 {
		respond.Error(w, http.StatusBadRequest, "Ad en az 2 karakter olmalı")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx := context.Background()

	// Build partial update
	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.Name != "" {
		setClauses = append(setClauses, "name = $"+itoa(argIdx))
		args = append(args, req.Name)
		argIdx++
	}
	if req.ExperienceLevel != "" {
		setClauses = append(setClauses, "experience_level = $"+itoa(argIdx))
		args = append(args, req.ExperienceLevel)
		argIdx++
	}
	if req.PreferredCurrency != "" {
		setClauses = append(setClauses, "preferred_currency = $"+itoa(argIdx))
		args = append(args, req.PreferredCurrency)
		argIdx++
	}
	if req.Theme != "" {
		setClauses = append(setClauses, "theme = $"+itoa(argIdx))
		args = append(args, req.Theme)
		argIdx++
	}

	if len(setClauses) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	query := "UPDATE users SET "
	for i, c := range setClauses {
		if i > 0 {
			query += ", "
		}
		query += c
	}
	query += " WHERE id = $" + itoa(argIdx)
	args = append(args, claims.UserID)

	_, err = pool.Exec(ctx, query, args...)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Profil güncellenemedi")
		return
	}

	// Return updated profile
	getProfile(w, claims)
}

func itoa(i int) string { return strconv.Itoa(i) }
