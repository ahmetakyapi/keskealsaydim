// Package handler serves the user's alert surface: price alerts and the
// notification inbox they feed. Both live behind one function because Vercel
// counts serverless functions per deployment; `resource` selects which.
package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

const (
	maxActiveAlertsPerUser = 50
	quoteTimeout           = 6 * time.Second
)

var validDirections = map[string]bool{"ABOVE": true, "BELOW": true}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}

	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("alerts", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	rawID := strings.TrimSpace(r.URL.Query().Get("id"))
	var itemID *uuid.UUID
	if rawID != "" {
		parsed, parseErr := uuid.Parse(rawID)
		if parseErr != nil {
			respond.Error(w, http.StatusBadRequest, "Geçersiz ID")
			return
		}
		itemID = &parsed
	}

	if r.URL.Query().Get("resource") == "notifications" {
		handleNotifications(w, r, pool, claims, itemID)
		return
	}
	handleAlerts(w, r, pool, claims, itemID)
}

// ── Notifications ──────────────────────────────────────────────────────────

type notification struct {
	ID        uuid.UUID       `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Message   string          `json:"message"`
	Data      json.RawMessage `json:"data"`
	IsRead    bool            `json:"isRead"`
	ReadAt    *time.Time      `json:"readAt"`
	CreatedAt time.Time       `json:"createdAt"`
}

func handleNotifications(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, claims *auth.Claims, itemID *uuid.UUID) {
	switch r.Method {
	case http.MethodGet:
		listNotifications(w, r, pool, claims)
	case http.MethodPatch:
		markNotificationsRead(w, pool, claims, itemID)
	case http.MethodDelete:
		deleteNotifications(w, pool, claims, itemID)
	default:
		respond.MethodNotAllowed(w)
	}
}

func listNotifications(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, claims *auth.Claims) {
	q := r.URL.Query()
	page, size := pageParams(q.Get("page"), q.Get("size"))
	unreadOnly := q.Get("unreadOnly") == "true"

	ctx, cancel := respond.Ctx()
	defer cancel()

	filter := ""
	if unreadOnly {
		filter = " AND is_read = FALSE"
	}

	var total, unread int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COUNT(*) FILTER (WHERE is_read = FALSE)
		   FROM notifications WHERE user_id = $1`,
		claims.UserID,
	).Scan(&total, &unread); err != nil {
		respond.LogError("alerts/notifications", "count", err)
		respond.Error(w, http.StatusInternalServerError, "Bildirimler sayılamadı")
		return
	}

	rows, err := pool.Query(ctx,
		`SELECT id, type, title, message, data, is_read, read_at, created_at
		   FROM notifications
		  WHERE user_id = $1`+filter+`
		  ORDER BY created_at DESC
		  LIMIT $2 OFFSET $3`,
		claims.UserID, size, page*size,
	)
	if err != nil {
		respond.LogError("alerts/notifications", "query", err)
		respond.Error(w, http.StatusInternalServerError, "Bildirimler getirilemedi")
		return
	}
	defer rows.Close()

	items := make([]notification, 0)
	for rows.Next() {
		var n notification
		if err := rows.Scan(&n.ID, &n.Type, &n.Title, &n.Message, &n.Data,
			&n.IsRead, &n.ReadAt, &n.CreatedAt); err != nil {
			respond.LogError("alerts/notifications", "scan", err)
			continue
		}
		items = append(items, n)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"content":       items,
		"totalElements": total,
		"unreadCount":   unread,
		"page":          page,
		"size":          size,
		"totalPages":    (total + size - 1) / size,
	})
}

func markNotificationsRead(w http.ResponseWriter, pool *pgxpool.Pool, claims *auth.Claims, itemID *uuid.UUID) {
	ctx, cancel := respond.Ctx()
	defer cancel()

	query := `UPDATE notifications SET is_read = TRUE, read_at = NOW()
	           WHERE user_id = $1 AND is_read = FALSE`
	args := []any{claims.UserID}
	if itemID != nil {
		query += " AND id = $2"
		args = append(args, *itemID)
	}

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("alerts/notifications", "mark read", err)
		respond.Error(w, http.StatusInternalServerError, "Bildirim güncellenemedi")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{"updated": tag.RowsAffected()})
}

func deleteNotifications(w http.ResponseWriter, pool *pgxpool.Pool, claims *auth.Claims, itemID *uuid.UUID) {
	ctx, cancel := respond.Ctx()
	defer cancel()

	query := "DELETE FROM notifications WHERE user_id = $1"
	args := []any{claims.UserID}
	if itemID != nil {
		query += " AND id = $2"
		args = append(args, *itemID)
	}

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("alerts/notifications", "delete", err)
		respond.Error(w, http.StatusInternalServerError, "Bildirim silinemedi")
		return
	}
	if itemID != nil && tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Bildirim bulunamadı")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{"deleted": tag.RowsAffected()})
}

// ── Price alerts ───────────────────────────────────────────────────────────

type priceAlert struct {
	ID             uuid.UUID  `json:"id"`
	Symbol         string     `json:"symbol"`
	SymbolName     string     `json:"symbolName"`
	TargetPrice    float64    `json:"targetPrice"`
	Direction      string     `json:"direction"`
	Status         string     `json:"status"`
	Message        *string    `json:"message"`
	NotifyEmail    bool       `json:"notifyEmail"`
	NotifyPush     bool       `json:"notifyPush"`
	TriggeredAt    *time.Time `json:"triggeredAt"`
	TriggeredPrice *float64   `json:"triggeredPrice"`
	ExpiresAt      *time.Time `json:"expiresAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	CurrentPrice   float64    `json:"currentPrice"`
	DistancePct    float64    `json:"distancePercent"`
}

type alertRequest struct {
	Symbol      string   `json:"symbol"`
	SymbolName  string   `json:"symbolName"`
	TargetPrice *float64 `json:"targetPrice"`
	Direction   string   `json:"direction"`
	Message     string   `json:"message"`
	NotifyEmail *bool    `json:"notifyEmail"`
	NotifyPush  *bool    `json:"notifyPush"`
	Status      string   `json:"status"`
	ExpiresAt   *string  `json:"expiresAt"`
}

func handleAlerts(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, claims *auth.Claims, itemID *uuid.UUID) {
	switch r.Method {
	case http.MethodGet:
		listAlerts(w, pool, claims)
	case http.MethodPost:
		createAlert(w, r, pool, claims)
	case http.MethodPatch:
		if itemID == nil {
			respond.Error(w, http.StatusBadRequest, "Alarm ID gerekli")
			return
		}
		updateAlert(w, r, pool, claims, *itemID)
	case http.MethodDelete:
		if itemID == nil {
			respond.Error(w, http.StatusBadRequest, "Alarm ID gerekli")
			return
		}
		deleteAlert(w, pool, claims, *itemID)
	default:
		respond.MethodNotAllowed(w)
	}
}

func listAlerts(w http.ResponseWriter, pool *pgxpool.Pool, claims *auth.Claims) {
	ctx, cancel := respond.Ctx()
	defer cancel()

	// Expire stale alerts before reading so the list never shows a live alert
	// whose window has already closed.
	if _, err := pool.Exec(ctx,
		`UPDATE price_alerts SET status = 'EXPIRED'
		  WHERE user_id = $1 AND status = 'ACTIVE'
		    AND expires_at IS NOT NULL AND expires_at <= NOW()`,
		claims.UserID,
	); err != nil {
		respond.LogError("alerts", "expire stale", err)
	}

	alerts, err := queryAlerts(ctx, pool, claims.UserID)
	if err != nil {
		respond.LogError("alerts", "query", err)
		respond.Error(w, http.StatusInternalServerError, "Alarmlar getirilemedi")
		return
	}

	// There is no background worker on this stack, so alerts are evaluated
	// whenever the user opens the screen. Triggered ones become notifications.
	prices := currentPrices(alerts)
	triggered := evaluateAlerts(ctx, pool, claims.UserID, alerts, prices)

	for i := range alerts {
		price, ok := prices[alerts[i].Symbol]
		if !ok || price <= 0 {
			continue
		}
		alerts[i].CurrentPrice = price
		if alerts[i].TargetPrice > 0 {
			alerts[i].DistancePct = round2((price - alerts[i].TargetPrice) / alerts[i].TargetPrice * 100)
		}
		if fired, ok := triggered[alerts[i].ID]; ok {
			alerts[i].Status = "TRIGGERED"
			alerts[i].TriggeredPrice = &fired.price
			alerts[i].TriggeredAt = &fired.at
		}
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"content":        alerts,
		"triggeredCount": len(triggered),
	})
}

func queryAlerts(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) ([]priceAlert, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, symbol, COALESCE(symbol_name, symbol), target_price, direction::text,
		        status::text, message, notify_email, notify_push,
		        triggered_at, triggered_price, expires_at, created_at
		   FROM price_alerts
		  WHERE user_id = $1
		  ORDER BY (status = 'ACTIVE') DESC, created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := make([]priceAlert, 0)
	for rows.Next() {
		var a priceAlert
		if err := rows.Scan(&a.ID, &a.Symbol, &a.SymbolName, &a.TargetPrice, &a.Direction,
			&a.Status, &a.Message, &a.NotifyEmail, &a.NotifyPush,
			&a.TriggeredAt, &a.TriggeredPrice, &a.ExpiresAt, &a.CreatedAt); err != nil {
			respond.LogError("alerts", "scan", err)
			continue
		}
		a.Symbol = finance.NormalizeStoredSymbol(a.Symbol)
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

// currentPrices fetches one quote per distinct symbol that still has a live alert.
func currentPrices(alerts []priceAlert) map[string]float64 {
	symbols := make(map[string]bool)
	for _, a := range alerts {
		if a.Status == "ACTIVE" {
			symbols[a.Symbol] = true
		}
	}
	if len(symbols) == 0 {
		return map[string]float64{}
	}

	var (
		mu     sync.Mutex
		wg     sync.WaitGroup
		prices = make(map[string]float64, len(symbols))
	)
	for symbol := range symbols {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			q, err := finance.GetQuoteWithTimeout(s, quoteTimeout)
			if err != nil || q == nil || q.Price <= 0 {
				respond.LogError("alerts", "quote "+s, err)
				return
			}
			mu.Lock()
			prices[s] = q.Price
			mu.Unlock()
		}(symbol)
	}
	wg.Wait()

	return prices
}

type triggerInfo struct {
	price float64
	at    time.Time
}

func evaluateAlerts(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID, alerts []priceAlert, prices map[string]float64) map[uuid.UUID]triggerInfo {
	fired := make(map[uuid.UUID]triggerInfo)

	for _, a := range alerts {
		if a.Status != "ACTIVE" {
			continue
		}
		price, ok := prices[a.Symbol]
		if !ok || price <= 0 {
			continue
		}
		if !alertHit(a.Direction, a.TargetPrice, price) {
			continue
		}

		now := time.Now().UTC()
		tag, err := pool.Exec(ctx,
			`UPDATE price_alerts
			    SET status = 'TRIGGERED', triggered_at = NOW(), triggered_price = $1
			  WHERE id = $2 AND user_id = $3 AND status = 'ACTIVE'`,
			price, a.ID, userID,
		)
		if err != nil {
			respond.LogError("alerts", "mark triggered", err)
			continue
		}
		if tag.RowsAffected() == 0 {
			continue // another request won the race
		}

		payload, _ := json.Marshal(map[string]any{
			"symbol":      a.Symbol,
			"targetPrice": a.TargetPrice,
			"price":       price,
			"direction":   a.Direction,
			"alertId":     a.ID,
		})
		title := fmt.Sprintf("%s Fiyat Alarmı", a.Symbol)
		message := fmt.Sprintf("%s %s %s seviyesine ulaştı. Güncel fiyat: %s.",
			a.SymbolName, directionLabel(a.Direction),
			strconv.FormatFloat(a.TargetPrice, 'f', 2, 64),
			strconv.FormatFloat(price, 'f', 2, 64))

		if _, err := pool.Exec(ctx,
			`INSERT INTO notifications (id, user_id, type, title, message, data)
			 VALUES ($1, $2, 'PRICE_ALERT', $3, $4, $5)`,
			uuid.New(), userID, title, message, payload,
		); err != nil {
			respond.LogError("alerts", "insert notification", err)
		}

		fired[a.ID] = triggerInfo{price: price, at: now}
	}

	return fired
}

func alertHit(direction string, target, price float64) bool {
	switch direction {
	case "ABOVE":
		return price >= target
	case "BELOW":
		return price <= target
	default:
		return false
	}
}

func directionLabel(direction string) string {
	if direction == "BELOW" {
		return "belirlediğiniz alt sınır"
	}
	return "belirlediğiniz üst sınır"
}

func createAlert(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, claims *auth.Claims) {
	var req alertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	req.Symbol = finance.NormalizeStoredSymbol(req.Symbol)
	if req.Symbol == "" {
		respond.Error(w, http.StatusBadRequest, "Sembol gerekli")
		return
	}
	req.Direction = strings.ToUpper(strings.TrimSpace(req.Direction))
	if !validDirections[req.Direction] {
		respond.Error(w, http.StatusBadRequest, "Yön ABOVE veya BELOW olmalı")
		return
	}
	if req.TargetPrice == nil || *req.TargetPrice <= 0 {
		respond.Error(w, http.StatusBadRequest, "Hedef fiyat pozitif olmalı")
		return
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		parsed, err := time.Parse("2006-01-02", *req.ExpiresAt)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "Geçersiz bitiş tarihi formatı")
			return
		}
		if !parsed.After(time.Now()) {
			respond.Error(w, http.StatusBadRequest, "Bitiş tarihi gelecekte olmalı")
			return
		}
		expiresAt = &parsed
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	var activeCount int
	if err := pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM price_alerts WHERE user_id = $1 AND status = 'ACTIVE'",
		claims.UserID,
	).Scan(&activeCount); err != nil {
		respond.LogError("alerts", "count active", err)
		respond.Error(w, http.StatusInternalServerError, "Alarmlar kontrol edilemedi")
		return
	}
	if activeCount >= maxActiveAlertsPerUser {
		respond.Error(w, http.StatusConflict,
			fmt.Sprintf("En fazla %d aktif alarm oluşturabilirsiniz", maxActiveAlertsPerUser))
		return
	}

	symbolName := strings.TrimSpace(req.SymbolName)
	if symbolName == "" {
		symbolName = req.Symbol
	}

	id := uuid.New()
	if _, err := pool.Exec(ctx,
		`INSERT INTO price_alerts
		   (id, user_id, symbol, symbol_name, target_price, direction, message,
		    notify_email, notify_push, expires_at)
		 VALUES ($1,$2,$3,$4,$5,$6::alert_direction,$7,$8,$9,$10)`,
		id, claims.UserID, req.Symbol, symbolName, *req.TargetPrice, req.Direction,
		nullStr(req.Message), boolOr(req.NotifyEmail, true), boolOr(req.NotifyPush, true), expiresAt,
	); err != nil {
		respond.LogError("alerts", "insert", err)
		respond.Error(w, http.StatusInternalServerError, "Alarm oluşturulamadı")
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]any{"id": id, "symbol": req.Symbol})
}

func updateAlert(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, claims *auth.Claims, alertID uuid.UUID) {
	var req alertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	sets := make([]string, 0, 4)
	args := make([]any, 0, 6)

	if req.TargetPrice != nil {
		if *req.TargetPrice <= 0 {
			respond.Error(w, http.StatusBadRequest, "Hedef fiyat pozitif olmalı")
			return
		}
		args = append(args, *req.TargetPrice)
		sets = append(sets, fmt.Sprintf("target_price = $%d", len(args)))
	}
	if req.Direction != "" {
		direction := strings.ToUpper(strings.TrimSpace(req.Direction))
		if !validDirections[direction] {
			respond.Error(w, http.StatusBadRequest, "Yön ABOVE veya BELOW olmalı")
			return
		}
		args = append(args, direction)
		sets = append(sets, fmt.Sprintf("direction = $%d::alert_direction", len(args)))
	}
	if req.Status != "" {
		status := strings.ToUpper(strings.TrimSpace(req.Status))
		if status != "ACTIVE" && status != "CANCELLED" {
			respond.Error(w, http.StatusBadRequest, "Durum ACTIVE veya CANCELLED olmalı")
			return
		}
		args = append(args, status)
		sets = append(sets, fmt.Sprintf("status = $%d::alert_status", len(args)))
		if status == "ACTIVE" {
			sets = append(sets, "triggered_at = NULL", "triggered_price = NULL")
		}
	}

	if len(sets) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	args = append(args, alertID, claims.UserID)
	query := fmt.Sprintf("UPDATE price_alerts SET %s WHERE id = $%d AND user_id = $%d",
		strings.Join(sets, ", "), len(args)-1, len(args))

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("alerts", "update", err)
		respond.Error(w, http.StatusInternalServerError, "Alarm güncellenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Alarm bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func deleteAlert(w http.ResponseWriter, pool *pgxpool.Pool, claims *auth.Claims, alertID uuid.UUID) {
	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM price_alerts WHERE id = $1 AND user_id = $2",
		alertID, claims.UserID,
	)
	if err != nil {
		respond.LogError("alerts", "delete", err)
		respond.Error(w, http.StatusInternalServerError, "Alarm silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Alarm bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ── Helpers ────────────────────────────────────────────────────────────────

func pageParams(rawPage, rawSize string) (int, int) {
	page, _ := strconv.Atoi(rawPage)
	if page < 0 {
		page = 0
	}
	size, _ := strconv.Atoi(rawSize)
	if size <= 0 || size > 50 {
		size = 20
	}
	return page, size
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

func boolOr(v *bool, fallback bool) bool {
	if v == nil {
		return fallback
	}
	return *v
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
