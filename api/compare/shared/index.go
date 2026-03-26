package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

type sharedScenario struct {
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
	ShareToken  string          `json:"shareToken"`
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

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		respond.Error(w, http.StatusBadRequest, "token gerekli")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("compare/shared", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var s sharedScenario
	var startDate, endDate interface{}
	err = pool.QueryRow(ctx,
		`SELECT id, symbol_a, symbol_a_name, symbol_b, symbol_b_name,
		        start_date, end_date, amount, amount_type, result_json,
		        title, share_token, view_count, created_at
		   FROM comparison_scenarios
		  WHERE share_token = $1`,
		token,
	).Scan(
		&s.ID, &s.SymbolA, &s.SymbolAName, &s.SymbolB, &s.SymbolBName,
		&startDate, &endDate, &s.Amount, &s.AmountType, &s.Result,
		&s.Title, &s.ShareToken, &s.ViewCount, &s.CreatedAt,
	)
	if err != nil {
		respond.Error(w, http.StatusNotFound, "Senaryo bulunamadı")
		return
	}

	// Format dates
	if t, ok := startDate.(time.Time); ok {
		s.StartDate = t.Format("2006-01-02")
	}
	if endDate != nil {
		if t, ok := endDate.(time.Time); ok {
			d := t.Format("2006-01-02")
			s.EndDate = &d
		}
	}
	s.SymbolA = finance.NormalizeStoredSymbol(s.SymbolA)
	s.SymbolB = finance.NormalizeStoredSymbol(s.SymbolB)

	// Increment view count asynchronously with timeout
	go func() {
		bgCtx, bgCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer bgCancel()
		if _, err := pool.Exec(bgCtx,
			"UPDATE comparison_scenarios SET view_count = view_count + 1 WHERE share_token = $1",
			token,
		); err != nil {
			respond.LogError("compare/shared", "increment view count", err)
		}
	}()

	respond.JSON(w, http.StatusOK, s)
}
