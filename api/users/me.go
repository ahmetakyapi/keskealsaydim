package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

const (
	minPasswordLength = 8
	bcryptCost        = 12
)

var (
	validExperienceLevels = map[string]bool{
		"BEGINNER": true, "INTERMEDIATE": true, "ADVANCED": true, "EXPERT": true,
	}
	validThemes      = map[string]bool{"dark": true, "light": true, "system": true}
	validCurrencies  = map[string]bool{"TRY": true, "USD": true, "EUR": true}
	validChartRanges = map[string]bool{"1W": true, "1M": true, "3M": true, "6M": true, "1Y": true, "5Y": true, "ALL": true}
)

type updateProfileRequest struct {
	Name              string                 `json:"name"`
	ExperienceLevel   string                 `json:"experienceLevel"`
	PreferredCurrency string                 `json:"preferredCurrency"`
	Theme             string                 `json:"theme"`
	Settings          *updateSettingsRequest `json:"settings"`
}

type updateSettingsRequest struct {
	NotifyPriceAlerts  *bool   `json:"notifyPriceAlerts"`
	NotifyDailySummary *bool   `json:"notifyDailySummary"`
	NotifyWeeklyReport *bool   `json:"notifyWeeklyReport"`
	NotifyNews         *bool   `json:"notifyNews"`
	EmailNotifications *bool   `json:"emailNotifications"`
	PushNotifications  *bool   `json:"pushNotifications"`
	CompactMode        *bool   `json:"compactMode"`
	ShowPortfolioValue *bool   `json:"showPortfolioValue"`
	DefaultChartPeriod *string `json:"defaultChartPeriod"`
}

type userSettings struct {
	NotifyPriceAlerts  bool   `json:"notifyPriceAlerts"`
	NotifyDailySummary bool   `json:"notifyDailySummary"`
	NotifyWeeklyReport bool   `json:"notifyWeeklyReport"`
	NotifyNews         bool   `json:"notifyNews"`
	EmailNotifications bool   `json:"emailNotifications"`
	PushNotifications  bool   `json:"pushNotifications"`
	CompactMode        bool   `json:"compactMode"`
	ShowPortfolioValue bool   `json:"showPortfolioValue"`
	DefaultChartPeriod string `json:"defaultChartPeriod"`
}

type userProfile struct {
	ID                  uuid.UUID    `json:"id"`
	Email               string       `json:"email"`
	Name                string       `json:"name"`
	ExperienceLevel     string       `json:"experienceLevel"`
	AvatarURL           *string      `json:"avatarUrl"`
	EmailVerified       bool         `json:"emailVerified"`
	IsActive            bool         `json:"isActive"`
	PreferredCurrency   string       `json:"preferredCurrency"`
	Theme               string       `json:"theme"`
	CreatedAt           time.Time    `json:"createdAt"`
	LastLoginAt         *time.Time   `json:"lastLoginAt"`
	Settings            userSettings `json:"settings"`
	UnreadNotifications int          `json:"unreadNotifications"`
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

	// `/api/users/password` rewrites here so password changes stay inside the
	// same serverless function as the rest of the account surface.
	if r.URL.Query().Get("action") == "password" {
		if r.Method != http.MethodPost && r.Method != http.MethodPut {
			respond.MethodNotAllowed(w)
			return
		}
		changePassword(w, r, claims)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getProfile(w, claims)
	case http.MethodPut, http.MethodPatch:
		updateProfile(w, r, claims)
	case http.MethodDelete:
		deleteAccount(w, r, claims)
	default:
		respond.MethodNotAllowed(w)
	}
}

const profileQuery = `
	SELECT
		u.id, u.email, u.name, u.experience_level::text, u.avatar_url,
		u.email_verified, u.is_active, u.preferred_currency, u.theme,
		u.created_at, u.last_login_at,
		COALESCE(s.notify_price_alerts, TRUE),
		COALESCE(s.notify_daily_summary, TRUE),
		COALESCE(s.notify_weekly_report, FALSE),
		COALESCE(s.notify_news, TRUE),
		COALESCE(s.email_notifications, TRUE),
		COALESCE(s.push_notifications, TRUE),
		COALESCE(s.compact_mode, FALSE),
		COALESCE(s.show_portfolio_value, TRUE),
		COALESCE(s.default_chart_period, '1M'),
		COALESCE(n.unread_count, 0)
	FROM users u
	LEFT JOIN user_settings s ON s.user_id = u.id
	LEFT JOIN (
		SELECT user_id, COUNT(*)::int AS unread_count
		FROM notifications
		WHERE is_read = FALSE
		GROUP BY user_id
	) n ON n.user_id = u.id
	WHERE u.id = $1`

func getProfile(w http.ResponseWriter, claims *auth.Claims) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("users/me", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	var p userProfile
	err = pool.QueryRow(ctx, profileQuery, claims.UserID).Scan(
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
		&p.Settings.ShowPortfolioValue,
		&p.Settings.DefaultChartPeriod,
		&p.UnreadNotifications,
	)
	if err != nil {
		respond.LogError("users/me", "query profile", err)
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

	userSets := make([]string, 0, 4)
	userArgs := make([]any, 0, 5)

	req.Name = strings.TrimSpace(req.Name)
	if req.Name != "" {
		if len([]rune(req.Name)) < 2 || len([]rune(req.Name)) > 100 {
			respond.Error(w, http.StatusBadRequest, "Ad 2-100 karakter arasında olmalı")
			return
		}
		userArgs = append(userArgs, req.Name)
		userSets = append(userSets, fmt.Sprintf("name = $%d", len(userArgs)))
	}
	if req.ExperienceLevel != "" {
		level := strings.ToUpper(strings.TrimSpace(req.ExperienceLevel))
		if !validExperienceLevels[level] {
			respond.Error(w, http.StatusBadRequest, "Geçersiz deneyim seviyesi")
			return
		}
		userArgs = append(userArgs, level)
		userSets = append(userSets, fmt.Sprintf("experience_level = $%d::experience_level", len(userArgs)))
	}
	if req.PreferredCurrency != "" {
		currency := strings.ToUpper(strings.TrimSpace(req.PreferredCurrency))
		if !validCurrencies[currency] {
			respond.Error(w, http.StatusBadRequest, "Geçersiz para birimi")
			return
		}
		userArgs = append(userArgs, currency)
		userSets = append(userSets, fmt.Sprintf("preferred_currency = $%d", len(userArgs)))
	}
	if req.Theme != "" {
		theme := strings.ToLower(strings.TrimSpace(req.Theme))
		if !validThemes[theme] {
			respond.Error(w, http.StatusBadRequest, "Geçersiz tema")
			return
		}
		userArgs = append(userArgs, theme)
		userSets = append(userSets, fmt.Sprintf("theme = $%d", len(userArgs)))
	}

	settingsSets := make([]string, 0, 9)
	settingsArgs := make([]any, 0, 10)
	if req.Settings != nil {
		s := req.Settings
		boolFields := []struct {
			column string
			value  *bool
		}{
			{"notify_price_alerts", s.NotifyPriceAlerts},
			{"notify_daily_summary", s.NotifyDailySummary},
			{"notify_weekly_report", s.NotifyWeeklyReport},
			{"notify_news", s.NotifyNews},
			{"email_notifications", s.EmailNotifications},
			{"push_notifications", s.PushNotifications},
			{"compact_mode", s.CompactMode},
			{"show_portfolio_value", s.ShowPortfolioValue},
		}
		for _, field := range boolFields {
			if field.value == nil {
				continue
			}
			settingsArgs = append(settingsArgs, *field.value)
			settingsSets = append(settingsSets, fmt.Sprintf("%s = $%d", field.column, len(settingsArgs)))
		}

		if s.DefaultChartPeriod != nil {
			period := strings.ToUpper(strings.TrimSpace(*s.DefaultChartPeriod))
			if !validChartRanges[period] {
				respond.Error(w, http.StatusBadRequest, "Geçersiz varsayılan grafik aralığı")
				return
			}
			settingsArgs = append(settingsArgs, period)
			settingsSets = append(settingsSets, fmt.Sprintf("default_chart_period = $%d", len(settingsArgs)))
		}
	}

	if len(userSets) == 0 && len(settingsSets) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("users/me", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		respond.LogError("users/me", "begin tx", err)
		respond.Error(w, http.StatusInternalServerError, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	if len(userSets) > 0 {
		userArgs = append(userArgs, claims.UserID)
		query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d",
			strings.Join(userSets, ", "), len(userArgs))
		if _, err = tx.Exec(ctx, query, userArgs...); err != nil {
			respond.LogError("users/me", "update user", err)
			respond.Error(w, http.StatusInternalServerError, "Profil güncellenemedi")
			return
		}
	}

	if len(settingsSets) > 0 {
		if _, err = tx.Exec(ctx,
			`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
			claims.UserID,
		); err != nil {
			respond.LogError("users/me", "ensure settings row", err)
			respond.Error(w, http.StatusInternalServerError, "Kullanıcı ayarları hazırlanamadı")
			return
		}

		settingsArgs = append(settingsArgs, claims.UserID)
		query := fmt.Sprintf("UPDATE user_settings SET %s, updated_at = NOW() WHERE user_id = $%d",
			strings.Join(settingsSets, ", "), len(settingsArgs))
		if _, err = tx.Exec(ctx, query, settingsArgs...); err != nil {
			respond.LogError("users/me", "update settings", err)
			respond.Error(w, http.StatusInternalServerError, "Kullanıcı ayarları güncellenemedi")
			return
		}
	}

	if err = tx.Commit(ctx); err != nil {
		respond.LogError("users/me", "commit tx", err)
		respond.Error(w, http.StatusInternalServerError, "Değişiklikler kaydedilemedi")
		return
	}

	getProfile(w, claims)
}

type passwordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func changePassword(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req passwordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	if req.CurrentPassword == "" {
		respond.Error(w, http.StatusBadRequest, "Mevcut şifre gerekli")
		return
	}
	if len(req.NewPassword) < minPasswordLength {
		respond.Error(w, http.StatusBadRequest,
			fmt.Sprintf("Yeni şifre en az %d karakter olmalı", minPasswordLength))
		return
	}
	if req.NewPassword == req.CurrentPassword {
		respond.Error(w, http.StatusBadRequest, "Yeni şifre mevcut şifreyle aynı olamaz")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("users/password", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var currentHash string
	if err := pool.QueryRow(ctx,
		"SELECT password_hash FROM users WHERE id = $1", claims.UserID,
	).Scan(&currentHash); err != nil {
		respond.LogError("users/password", "load hash", err)
		respond.Error(w, http.StatusNotFound, "Kullanıcı bulunamadı")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		respond.Error(w, http.StatusUnauthorized, "Mevcut şifre hatalı")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcryptCost)
	if err != nil {
		respond.LogError("users/password", "hash password", err)
		respond.Error(w, http.StatusInternalServerError, "Şifre işlenirken hata oluştu")
		return
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		respond.LogError("users/password", "begin tx", err)
		respond.Error(w, http.StatusInternalServerError, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		"UPDATE users SET password_hash = $1 WHERE id = $2", string(newHash), claims.UserID,
	); err != nil {
		respond.LogError("users/password", "update hash", err)
		respond.Error(w, http.StatusInternalServerError, "Şifre güncellenemedi")
		return
	}

	// A password change invalidates every existing session; the caller has to
	// sign in again with the new credentials.
	if _, err := tx.Exec(ctx,
		"UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
		claims.UserID,
	); err != nil {
		respond.LogError("users/password", "revoke sessions", err)
		respond.Error(w, http.StatusInternalServerError, "Oturumlar sonlandırılamadı")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		respond.LogError("users/password", "commit tx", err)
		respond.Error(w, http.StatusInternalServerError, "Şifre güncellenemedi")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"message":         "Şifreniz güncellendi, lütfen tekrar giriş yapın",
		"sessionsRevoked": true,
	})
}

type deleteAccountRequest struct {
	Password string `json:"password"`
	Confirm  string `json:"confirm"`
}

func deleteAccount(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req deleteAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	if strings.ToUpper(strings.TrimSpace(req.Confirm)) != "HESABIMI SIL" {
		respond.Error(w, http.StatusBadRequest, `Onaylamak için "HESABIMI SIL" yazın`)
		return
	}
	if req.Password == "" {
		respond.Error(w, http.StatusBadRequest, "Şifre gerekli")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("users/me", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var hash string
	if err := pool.QueryRow(ctx,
		"SELECT password_hash FROM users WHERE id = $1", claims.UserID,
	).Scan(&hash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "Kullanıcı bulunamadı")
			return
		}
		respond.LogError("users/me", "load hash", err)
		respond.Error(w, http.StatusInternalServerError, "Hesap doğrulanamadı")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		respond.Error(w, http.StatusUnauthorized, "Şifre hatalı")
		return
	}

	// Every child table cascades from users, so one delete clears the account.
	if _, err := pool.Exec(ctx, "DELETE FROM users WHERE id = $1", claims.UserID); err != nil {
		respond.LogError("users/me", "delete account", err)
		respond.Error(w, http.StatusInternalServerError, "Hesap silinemedi")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
