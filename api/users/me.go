package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

type updateProfileRequest struct {
	Name              string `json:"name"`
	ExperienceLevel   string `json:"experienceLevel"`
	PreferredCurrency string `json:"preferredCurrency"`
	Theme             string `json:"theme"`
	Settings          *updateSettingsRequest `json:"settings"`
}

type updateSettingsRequest struct {
	NotifyPriceAlerts   *bool `json:"notifyPriceAlerts"`
	NotifyDailySummary  *bool `json:"notifyDailySummary"`
	NotifyWeeklyReport  *bool `json:"notifyWeeklyReport"`
	NotifyNews          *bool `json:"notifyNews"`
	EmailNotifications  *bool `json:"emailNotifications"`
	PushNotifications   *bool `json:"pushNotifications"`
	CompactMode         *bool `json:"compactMode"`
}

type userSettings struct {
	NotifyPriceAlerts   bool `json:"notifyPriceAlerts"`
	NotifyDailySummary  bool `json:"notifyDailySummary"`
	NotifyWeeklyReport  bool `json:"notifyWeeklyReport"`
	NotifyNews          bool `json:"notifyNews"`
	EmailNotifications  bool `json:"emailNotifications"`
	PushNotifications   bool `json:"pushNotifications"`
	CompactMode         bool `json:"compactMode"`
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
	Settings          userSettings `json:"settings"`
	UnreadNotifications int       `json:"unreadNotifications"`
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
		`SELECT
			u.id,
			u.email,
			u.name,
			u.experience_level,
			u.avatar_url,
			u.email_verified,
			u.is_active,
			u.preferred_currency,
			u.theme,
			u.created_at,
			u.last_login_at,
			COALESCE(s.notify_price_alerts, TRUE),
			COALESCE(s.notify_daily_summary, TRUE),
			COALESCE(s.notify_weekly_report, FALSE),
			COALESCE(s.notify_news, TRUE),
			COALESCE(s.email_notifications, TRUE),
			COALESCE(s.push_notifications, TRUE),
			COALESCE(s.compact_mode, FALSE),
			COALESCE(n.unread_count, 0)
		FROM users u
		LEFT JOIN user_settings s ON s.user_id = u.id
		LEFT JOIN (
			SELECT user_id, COUNT(*)::int AS unread_count
			FROM notifications
			WHERE is_read = FALSE
			GROUP BY user_id
		) n ON n.user_id = u.id
		WHERE u.id = $1`,
		claims.UserID,
	).Scan(
		&p.ID, &p.Email, &p.Name, &p.ExperienceLevel, &p.AvatarURL,
		&p.EmailVerified, &p.IsActive, &p.PreferredCurrency, &p.Theme,
		&p.CreatedAt, &p.LastLoginAt,
		&p.Settings.NotifyPriceAlerts,
		&p.Settings.NotifyDailySummary,
		&p.Settings.NotifyWeeklyReport,
		&p.Settings.NotifyNews,
		&p.Settings.EmailNotifications,
		&p.Settings.PushNotifications,
		&p.Settings.CompactMode,
		&p.UnreadNotifications,
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

	settingsSetClauses := []string{}
	settingsArgs := []interface{}{}
	settingsArgIdx := 1
	if req.Settings != nil {
		if req.Settings.NotifyPriceAlerts != nil {
			settingsSetClauses = append(settingsSetClauses, "notify_price_alerts = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.NotifyPriceAlerts)
			settingsArgIdx++
		}
		if req.Settings.NotifyDailySummary != nil {
			settingsSetClauses = append(settingsSetClauses, "notify_daily_summary = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.NotifyDailySummary)
			settingsArgIdx++
		}
		if req.Settings.NotifyWeeklyReport != nil {
			settingsSetClauses = append(settingsSetClauses, "notify_weekly_report = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.NotifyWeeklyReport)
			settingsArgIdx++
		}
		if req.Settings.NotifyNews != nil {
			settingsSetClauses = append(settingsSetClauses, "notify_news = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.NotifyNews)
			settingsArgIdx++
		}
		if req.Settings.EmailNotifications != nil {
			settingsSetClauses = append(settingsSetClauses, "email_notifications = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.EmailNotifications)
			settingsArgIdx++
		}
		if req.Settings.PushNotifications != nil {
			settingsSetClauses = append(settingsSetClauses, "push_notifications = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.PushNotifications)
			settingsArgIdx++
		}
		if req.Settings.CompactMode != nil {
			settingsSetClauses = append(settingsSetClauses, "compact_mode = $"+itoa(settingsArgIdx))
			settingsArgs = append(settingsArgs, *req.Settings.CompactMode)
			settingsArgIdx++
		}
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

	if len(setClauses) == 0 && len(settingsSetClauses) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	if len(setClauses) > 0 {
		query := "UPDATE users SET "
		for i, c := range setClauses {
			if i > 0 {
				query += ", "
			}
			query += c
		}
		query += " WHERE id = $" + itoa(argIdx)
		args = append(args, claims.UserID)

		if _, err = tx.Exec(ctx, query, args...); err != nil {
			respond.Error(w, http.StatusInternalServerError, "Profil güncellenemedi")
			return
		}
	}

	if len(settingsSetClauses) > 0 {
		if _, err = tx.Exec(ctx,
			`INSERT INTO user_settings (user_id) VALUES ($1)
			 ON CONFLICT (user_id) DO NOTHING`,
			claims.UserID,
		); err != nil {
			respond.Error(w, http.StatusInternalServerError, "Kullanıcı ayarları hazırlanamadı")
			return
		}

		settingsQuery := "UPDATE user_settings SET "
		for i, c := range settingsSetClauses {
			if i > 0 {
				settingsQuery += ", "
			}
			settingsQuery += c
		}
		settingsQuery += ", updated_at = NOW() WHERE user_id = $" + itoa(settingsArgIdx)
		settingsArgs = append(settingsArgs, claims.UserID)

		if _, err = tx.Exec(ctx, settingsQuery, settingsArgs...); err != nil {
			respond.Error(w, http.StatusInternalServerError, "Kullanıcı ayarları güncellenemedi")
			return
		}
	}

	if err = tx.Commit(ctx); err != nil {
		respond.Error(w, http.StatusInternalServerError, "Değişiklikler kaydedilemedi")
		return
	}

	// Return updated profile
	getProfile(w, claims)
}

func itoa(i int) string { return strconv.Itoa(i) }
