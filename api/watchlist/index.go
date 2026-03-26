package handler

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

type addWatchRequest struct {
	Symbol     string `json:"symbol"`
	SymbolName string `json:"symbolName"`
	Exchange   string `json:"exchange"`
	Notes      string `json:"notes"`
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
		getWatchlist(w, claims)
	case http.MethodPost:
		addWatchlist(w, r, claims)
	default:
		respond.MethodNotAllowed(w)
	}
}

type watchItem struct {
	ID            uuid.UUID `json:"id"`
	Symbol        string    `json:"symbol"`
	SymbolName    string    `json:"symbolName"`
	Exchange      string    `json:"exchange"`
	Notes         *string   `json:"notes"`
	DisplayOrder  int       `json:"displayOrder"`
	AddedAt       time.Time `json:"addedAt"`
	Price         float64   `json:"price"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"changePercent"`
	Week52High    float64   `json:"week52High"`
	Week52Low     float64   `json:"week52Low"`
	Volume        int64     `json:"volume"`
}

func getWatchlist(w http.ResponseWriter, claims *auth.Claims) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/get", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	rows, err := pool.Query(ctx,
		`SELECT id, symbol, symbol_name, exchange, notes, display_order, added_at
		   FROM watchlist
		  WHERE user_id = $1
		  ORDER BY display_order ASC, added_at DESC`,
		claims.UserID,
	)
	if err != nil {
		respond.LogError("watchlist/get", "query watchlist", err)
		respond.Error(w, http.StatusInternalServerError, "Favori listesi getirilemedi")
		return
	}
	defer rows.Close()

	items := make([]watchItem, 0)
	for rows.Next() {
		var it watchItem
		if err := rows.Scan(
			&it.ID, &it.Symbol, &it.SymbolName, &it.Exchange,
			&it.Notes, &it.DisplayOrder, &it.AddedAt,
		); err != nil {
			respond.LogError("watchlist/get", "scan row", err)
			continue
		}
		it.Symbol = finance.NormalizeStoredSymbol(it.Symbol)
		items = append(items, it)
	}

	// Fetch quotes concurrently (8s per-symbol timeout)
	type quoteRes struct {
		i int
		q *finance.Quote
	}
	ch := make(chan quoteRes, len(items))
	var wg sync.WaitGroup
	for i, it := range items {
		wg.Add(1)
		go func(idx int, sym string) {
			defer wg.Done()
			q, err := finance.GetQuoteWithTimeout(sym, 8*time.Second)
			if err != nil {
				respond.LogError("watchlist/get", "fetch quote "+sym, err)
			}
			ch <- quoteRes{idx, q}
		}(i, it.Symbol)
	}
	wg.Wait()
	close(ch)

	for r := range ch {
		if r.q != nil {
			items[r.i].Price = r.q.Price
			items[r.i].Change = r.q.Change
			items[r.i].ChangePercent = r.q.ChangePercent
			items[r.i].Week52High = r.q.Week52High
			items[r.i].Week52Low = r.q.Week52Low
			items[r.i].Volume = r.q.Volume
		}
	}

	respond.JSON(w, http.StatusOK, items)
}

func addWatchlist(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req addWatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	req.Symbol = finance.NormalizeStoredSymbol(req.Symbol)
	if req.Symbol == "" {
		respond.Error(w, http.StatusBadRequest, "symbol gerekli")
		return
	}
	if req.Exchange == "" {
		req.Exchange = "BIST"
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/add", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var exists bool
	variants := finance.SymbolVariants(req.Symbol)
	switch len(variants) {
	case 2:
		err = pool.QueryRow(ctx,
			`SELECT EXISTS(
				SELECT 1
				FROM watchlist
				WHERE user_id = $1 AND (symbol = $2 OR symbol = $3)
			)`,
			claims.UserID, variants[0], variants[1],
		).Scan(&exists)
	default:
		err = pool.QueryRow(ctx,
			`SELECT EXISTS(
				SELECT 1
				FROM watchlist
				WHERE user_id = $1 AND symbol = $2
			)`,
			claims.UserID, req.Symbol,
		).Scan(&exists)
	}
	if err != nil {
		respond.LogError("watchlist/add", "check exists", err)
		respond.Error(w, http.StatusInternalServerError, "Favori listesi kontrol edilemedi")
		return
	}
	if exists {
		respond.Error(w, http.StatusConflict, "Bu hisse zaten izleme listenizde")
		return
	}

	id := uuid.New()
	tag, err := pool.Exec(ctx,
		`INSERT INTO watchlist (id, user_id, symbol, symbol_name, exchange, notes)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 ON CONFLICT (user_id, symbol) DO NOTHING`,
		id, claims.UserID, req.Symbol, req.SymbolName, req.Exchange,
		nullStr(req.Notes),
	)
	if err != nil {
		respond.LogError("watchlist/add", "insert watchlist", err)
		respond.Error(w, http.StatusInternalServerError, "Favoriye eklenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusConflict, "Bu hisse zaten izleme listenizde")
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]any{"id": id, "symbol": req.Symbol})
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
