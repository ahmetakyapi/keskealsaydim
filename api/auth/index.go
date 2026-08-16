package handler

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

const (
	minPasswordLength = 8
	// bcrypt silently ignores everything past 72 bytes, so a longer password
	// must be rejected instead of being truncated (or erroring at hash time).
	maxPasswordBytes = 72
	maxNameLength    = 100
	bcryptCost       = 12
)

var validExperienceLevels = map[string]bool{
	"BEGINNER": true, "INTERMEDIATE": true, "ADVANCED": true, "EXPERT": true,
}

var (
	loginLimit = respond.RateLimit{Name: "login", Max: 10, Window: 5 * time.Minute}
	// Registration is rarer and more expensive, so it gets a tighter budget.
	registerLimit = respond.RateLimit{Name: "register", Max: 5, Window: time.Hour}
	refreshLimit  = respond.RateLimit{Name: "refresh", Max: 60, Window: 5 * time.Minute}
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

	// Limit per IP+email so one attacker cannot grind a single account, and a
	// shared NAT cannot lock every user out either.
	if !loginLimit.Allow(w, r, req.Email) {
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("auth/login", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	var (
		userID              uuid.UUID
		email, name         string
		passwordHash        string
		experienceLevel     string
		avatarURL           *string
		emailVerified       bool
		isActive            bool
		preferredCurrency   string
		theme               string
		createdAt           time.Time
		lastLoginAt         *time.Time
		notifyPriceAlerts   bool
		notifyDailySummary  bool
		notifyWeeklyReport  bool
		notifyNews          bool
		emailNotifications  bool
		pushNotifications   bool
		compactMode         bool
		unreadNotifications int
	)

	err = pool.QueryRow(ctx,
		`SELECT
			u.id,
			u.email,
			u.password_hash,
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
		WHERE u.email = $1`,
		req.Email,
	).Scan(
		&userID, &email, &passwordHash, &name, &experienceLevel,
		&avatarURL, &emailVerified, &isActive,
		&preferredCurrency, &theme, &createdAt, &lastLoginAt,
		&notifyPriceAlerts,
		&notifyDailySummary,
		&notifyWeeklyReport,
		&notifyNews,
		&emailNotifications,
		&pushNotifications,
		&compactMode,
		&unreadNotifications,
	)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "E-posta veya şifre hatalı")
		return
	}

	if !isActive {
		respond.Error(w, http.StatusForbidden, "Hesabınız devre dışı bırakılmış")
		return
	}

	if len(req.Password) > maxPasswordBytes {
		respond.Error(w, http.StatusUnauthorized, "E-posta veya şifre hatalı")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respond.Error(w, http.StatusUnauthorized, "E-posta veya şifre hatalı")
		return
	}

	if _, err := pool.Exec(ctx, "UPDATE users SET last_login_at = NOW() WHERE id = $1", userID); err != nil {
		respond.LogError("auth/login", "update last_login_at", err)
	}

	accessToken, err := auth.GenerateAccessToken(userID, email)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "JWT yapılandırması eksik")
		return
	}
	refreshToken, err := auth.GenerateRefreshToken(userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "JWT yapılandırması eksik")
		return
	}

	if _, err = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, refreshToken, time.Now().Add(auth.RefreshTokenTTL),
	); err != nil {
		respond.LogError("auth/login", "insert session", err)
		respond.Error(w, http.StatusInternalServerError, "Oturum başlatılamadı")
		return
	}

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
			"settings": map[string]any{
				"notifyPriceAlerts":  notifyPriceAlerts,
				"notifyDailySummary": notifyDailySummary,
				"notifyWeeklyReport": notifyWeeklyReport,
				"notifyNews":         notifyNews,
				"emailNotifications": emailNotifications,
				"pushNotifications":  pushNotifications,
				"compactMode":        compactMode,
			},
			"unreadNotifications": unreadNotifications,
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

	if !registerLimit.Allow(w, r, "") {
		return
	}

	// Count runes, not bytes: "Ayşe" is 4 characters but 5 bytes, and the old
	// byte check let a single-character Turkish name through.
	nameLength := len([]rune(req.Name))
	if nameLength < 2 {
		respond.Error(w, http.StatusBadRequest, "Ad en az 2 karakter olmalıdır")
		return
	}
	if nameLength > maxNameLength {
		respond.Error(w, http.StatusBadRequest, "Ad en fazla 100 karakter olabilir")
		return
	}
	if !emailRegex.MatchString(req.Email) || len(req.Email) > 255 {
		respond.Error(w, http.StatusBadRequest, "Geçerli bir e-posta adresi giriniz")
		return
	}
	if len(req.Password) < minPasswordLength {
		respond.Error(w, http.StatusBadRequest, "Şifre en az 8 karakter olmalıdır")
		return
	}
	if len(req.Password) > maxPasswordBytes {
		respond.Error(w, http.StatusBadRequest, "Şifre çok uzun, en fazla 72 bayt olabilir")
		return
	}
	if req.ExperienceLevel == "" {
		req.ExperienceLevel = "BEGINNER"
	}
	req.ExperienceLevel = strings.ToUpper(req.ExperienceLevel)
	if !validExperienceLevels[req.ExperienceLevel] {
		respond.Error(w, http.StatusBadRequest, "Geçersiz deneyim seviyesi")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("auth/register", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	var exists bool
	if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", req.Email).Scan(&exists); err != nil {
		respond.LogError("auth/register", "check email exists", err)
		respond.Error(w, http.StatusInternalServerError, "Kayıt kontrol edilemedi")
		return
	}
	if exists {
		respond.Error(w, http.StatusConflict, "Bu e-posta adresi zaten kullanılıyor")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		respond.LogError("auth/register", "bcrypt hash", err)
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
		respond.LogError("auth/register", "insert user", err)
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

	if _, err = pool.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, refreshToken, time.Now().Add(auth.RefreshTokenTTL),
	); err != nil {
		respond.LogError("auth/register", "insert session", err)
		respond.Error(w, http.StatusInternalServerError, "Oturum başlatılamadı")
		return
	}

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
			"settings": map[string]any{
				"notifyPriceAlerts":  true,
				"notifyDailySummary": true,
				"notifyWeeklyReport": false,
				"notifyNews":         true,
				"emailNotifications": true,
				"pushNotifications":  true,
				"compactMode":        false,
			},
			"unreadNotifications": 0,
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

	if !refreshLimit.Allow(w, r, "") {
		return
	}

	userID, err := auth.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		if auth.IsConfigError(err) {
			respond.Error(w, http.StatusInternalServerError, "JWT yapılandırması eksik")
			return
		}
		respond.Error(w, http.StatusUnauthorized, "Geçersiz veya süresi dolmuş token")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("auth/refresh", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		respond.LogError("auth/refresh", "begin tx", err)
		respond.Error(w, http.StatusInternalServerError, "Oturum yenileme işlemi başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	var sessionID uuid.UUID
	var email string
	err = tx.QueryRow(ctx,
		`SELECT s.id, u.email
		   FROM user_sessions s
		   JOIN users u ON u.id = s.user_id
		  WHERE s.refresh_token = $1
		    AND s.revoked_at IS NULL
		    AND s.expires_at > NOW()
		    AND u.is_active = true
		  FOR UPDATE`,
		req.RefreshToken,
	).Scan(&sessionID, &email)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Geçersiz veya süresi dolmuş token")
		return
	}

	newAccess, err := auth.GenerateAccessToken(userID, email)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "JWT yapılandırması eksik")
		return
	}
	newRefresh, err := auth.GenerateRefreshToken(userID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "JWT yapılandırması eksik")
		return
	}

	if _, err = tx.Exec(ctx,
		"UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1",
		sessionID,
	); err != nil {
		respond.LogError("auth/refresh", "revoke old session", err)
		respond.Error(w, http.StatusInternalServerError, "Eski oturum sonlandırılamadı")
		return
	}

	if _, err = tx.Exec(ctx,
		`INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New(), userID, newRefresh, time.Now().Add(auth.RefreshTokenTTL),
	); err != nil {
		respond.LogError("auth/refresh", "insert new session", err)
		respond.Error(w, http.StatusInternalServerError, "Oturum yenilenemedi")
		return
	}

	if err = tx.Commit(ctx); err != nil {
		respond.LogError("auth/refresh", "commit tx", err)
		respond.Error(w, http.StatusInternalServerError, "Oturum yenilenemedi")
		return
	}

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
	claims, err := auth.FromRequest(r)
	if err != nil {
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
		respond.LogError("auth/logout", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	// Scope the revoke to the caller: without the user_id check anyone holding
	// a valid access token could revoke another account's session.
	if _, err := pool.Exec(ctx,
		`UPDATE user_sessions SET revoked_at = NOW()
		  WHERE refresh_token = $1 AND user_id = $2 AND revoked_at IS NULL`,
		req.RefreshToken, claims.UserID,
	); err != nil {
		respond.LogError("auth/logout", "revoke session", err)
	}

	// Opportunistically prune rows that can never be used again so the table
	// does not grow without bound.
	if _, err := pool.Exec(ctx,
		"DELETE FROM user_sessions WHERE user_id = $1 AND (expires_at < NOW() OR revoked_at < NOW() - INTERVAL '7 days')",
		claims.UserID,
	); err != nil {
		respond.LogError("auth/logout", "prune sessions", err)
	}

	w.WriteHeader(http.StatusNoContent)
}
