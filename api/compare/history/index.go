package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
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

	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	rawID := strings.TrimSpace(r.URL.Query().Get("id"))
	var scenarioID *uuid.UUID
	if rawID != "" {
		parsed, parseErr := uuid.Parse(rawID)
		if parseErr != nil {
			respond.Error(w, http.StatusBadRequest, "Geçersiz senaryo ID")
			return
		}
		scenarioID = &parsed
	}

	switch r.Method {
	case http.MethodGet:
		listScenarios(w, r, claims)
	case http.MethodPatch:
		if scenarioID == nil {
			respond.Error(w, http.StatusBadRequest, "Senaryo ID gerekli")
			return
		}
		updateScenario(w, r, claims, *scenarioID)
	case http.MethodDelete:
		if scenarioID == nil {
			respond.Error(w, http.StatusBadRequest, "Senaryo ID gerekli")
			return
		}
		deleteScenario(w, claims, *scenarioID)
	default:
		respond.MethodNotAllowed(w)
	}
}

func listScenarios(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
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

	filter := ""
	if q.Get("favoritesOnly") == "true" {
		filter = " AND is_favorite = TRUE"
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("compare/history", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var allCount, favorites int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COUNT(*) FILTER (WHERE is_favorite)
		   FROM comparison_scenarios WHERE user_id = $1`,
		claims.UserID,
	).Scan(&allCount, &favorites); err != nil {
		respond.LogError("compare/history", "count scenarios", err)
		respond.Error(w, http.StatusInternalServerError, "Senaryo sayısı alınamadı")
		return
	}

	total := allCount
	if filter != "" {
		total = favorites
	}

	rows, err := pool.Query(ctx,
		`SELECT id, symbol_a, symbol_a_name, symbol_b, symbol_b_name,
		        start_date, end_date, amount, amount_type, result_json,
		        title, notes, is_favorite, share_token, view_count, created_at
		   FROM comparison_scenarios
		  WHERE user_id = $1`+filter+`
		  ORDER BY created_at DESC
		  LIMIT $2 OFFSET $3`,
		claims.UserID, size, offset,
	)
	if err != nil {
		respond.LogError("compare/history", "query scenarios", err)
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
			respond.LogError("compare/history", "scan row", err)
			continue
		}
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
		scenarios = append(scenarios, s)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"content":        scenarios,
		"totalElements":  total,
		"totalPages":     (total + size - 1) / size,
		"page":           page,
		"size":           size,
		"favoriteCount":  favorites,
		"totalScenarios": allCount,
	})
}

type scenarioUpdate struct {
	IsFavorite *bool   `json:"isFavorite"`
	Title      *string `json:"title"`
	Notes      *string `json:"notes"`
}

func updateScenario(w http.ResponseWriter, r *http.Request, claims *auth.Claims, scenarioID uuid.UUID) {
	var req scenarioUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	sets := make([]string, 0, 3)
	args := make([]any, 0, 5)

	if req.IsFavorite != nil {
		args = append(args, *req.IsFavorite)
		sets = append(sets, fmt.Sprintf("is_favorite = $%d", len(args)))
	}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if len([]rune(title)) > 255 {
			respond.Error(w, http.StatusBadRequest, "Başlık en fazla 255 karakter olabilir")
			return
		}
		args = append(args, nullStr(title))
		sets = append(sets, fmt.Sprintf("title = $%d", len(args)))
	}
	if req.Notes != nil {
		args = append(args, nullStr(strings.TrimSpace(*req.Notes)))
		sets = append(sets, fmt.Sprintf("notes = $%d", len(args)))
	}

	if len(sets) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("compare/history", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	args = append(args, scenarioID, claims.UserID)
	query := fmt.Sprintf("UPDATE comparison_scenarios SET %s WHERE id = $%d AND user_id = $%d",
		strings.Join(sets, ", "), len(args)-1, len(args))

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("compare/history", "update scenario", err)
		respond.Error(w, http.StatusInternalServerError, "Senaryo güncellenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Senaryo bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func deleteScenario(w http.ResponseWriter, claims *auth.Claims, scenarioID uuid.UUID) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("compare/history", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM comparison_scenarios WHERE id = $1 AND user_id = $2",
		scenarioID, claims.UserID,
	)
	if err != nil {
		respond.LogError("compare/history", "delete scenario", err)
		respond.Error(w, http.StatusInternalServerError, "Senaryo silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Senaryo bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}
