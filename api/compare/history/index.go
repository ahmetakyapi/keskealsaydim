package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

type scenarioRow struct {
	ID          uuid.UUID       `json:"id"`
	SymbolA     string          `json:"symbolA"`
	SymbolAName string          `json:"symbolAName"`
	SymbolB     string          `json:"symbolB"`
	SymbolBName string          `json:"symbolBName"`
	StartDate   string          `json:"startDate"`
	EndDate     *string         `json:"endDate"`
	Amount      float64         `json:"amount"`
	AmountType  string          `json:"amountType"`
	Result      json.RawMessage `json:"result"`
	Title       *string         `json:"title"`
	Notes       *string         `json:"notes"`
	IsFavorite  bool            `json:"isFavorite"`
	ShareToken  *string         `json:"shareToken"`
	ViewCount   int             `json:"viewCount"`
	CreatedAt   time.Time       `json:"createdAt"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		respond.MethodNotAllowed(w)
		return
	}

	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("size"))
	if page < 0 {
		page = 0
	}
	if size <= 0 || size > 50 {
		size = 10
	}
	offset := page * size

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx := context.Background()

	// Count total
	var total int
	_ = pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM comparison_scenarios WHERE user_id = $1",
		claims.UserID,
	).Scan(&total)

	rows, err := pool.Query(ctx,
		`SELECT id, symbol_a, symbol_a_name, symbol_b, symbol_b_name,
		        start_date, end_date, amount, amount_type, result_json,
		        title, notes, is_favorite, share_token, view_count, created_at
		   FROM comparison_scenarios
		  WHERE user_id = $1
		  ORDER BY created_at DESC
		  LIMIT $2 OFFSET $3`,
		claims.UserID, size, offset,
	)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Senaryolar getirilemedi")
		return
	}
	defer rows.Close()

	scenarios := make([]scenarioRow, 0)
	for rows.Next() {
		var s scenarioRow
		var startDate, endDate interface{}
		if err := rows.Scan(
			&s.ID, &s.SymbolA, &s.SymbolAName, &s.SymbolB, &s.SymbolBName,
			&startDate, &endDate, &s.Amount, &s.AmountType, &s.Result,
			&s.Title, &s.Notes, &s.IsFavorite, &s.ShareToken, &s.ViewCount, &s.CreatedAt,
		); err != nil {
			continue
		}
		// Format dates as strings
		if t, ok := startDate.(time.Time); ok {
			s.StartDate = t.Format("2006-01-02")
		}
		if endDate != nil {
			if t, ok := endDate.(time.Time); ok {
				d := t.Format("2006-01-02")
				s.EndDate = &d
			}
		}
		scenarios = append(scenarios, s)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"content":       scenarios,
		"totalElements": total,
		"totalPages":    (total + size - 1) / size,
		"page":          page,
		"size":          size,
	})
}
