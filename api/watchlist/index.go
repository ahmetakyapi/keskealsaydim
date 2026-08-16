package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/cache"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

const (
	maxWatchlistItems   = 100
	maxConcurrentQuotes = 8
	quoteCacheTTL       = time.Minute
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
	Currency      string    `json:"currency"`
	Notes         *string   `json:"notes"`
	DisplayOrder  int       `json:"displayOrder"`
	AddedAt       time.Time `json:"addedAt"`
	Price         float64   `json:"price"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"changePercent"`
	Open          float64   `json:"open"`
	DayHigh       float64   `json:"high"`
	DayLow        float64   `json:"low"`
	Week52High    float64   `json:"week52High"`
	Week52Low     float64   `json:"week52Low"`
	Volume        int64     `json:"volume"`
	// PriceAvailable distinguishes "the price really is zero" from "we could
	// not reach the data provider", which the UI must not render alike.
	PriceAvailable bool `json:"priceAvailable"`
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
		`SELECT id, symbol, COALESCE(symbol_name, symbol), COALESCE(exchange, 'BIST'),
		        notes, display_order, added_at
		   FROM watchlist
		  WHERE user_id = $1
		  ORDER BY display_order ASC, added_at DESC`,
		claims.UserID,
	)
	if err != nil {
		respond.LogError("watchlist/get", "query watchlist", err)
		respond.Error(w, http.StatusInternalServerError, "İzleme listesi getirilemedi")
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
	if err := rows.Err(); err != nil {
		respond.LogError("watchlist/get", "iterate rows", err)
	}

	enrichWithQuotes(items)
	respond.JSON(w, http.StatusOK, items)
}

// enrichWithQuotes fills in live prices, sharing the same cached quotes the
// price endpoint uses and capping how many Yahoo calls run at once.
func enrichWithQuotes(items []watchItem) {
	if len(items) == 0 {
		return
	}

	sem := make(chan struct{}, maxConcurrentQuotes)
	var wg sync.WaitGroup

	for i := range items {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			q := cachedQuote(items[idx].Symbol)
			if q == nil {
				return
			}
			items[idx].Price = q.Price
			items[idx].Change = q.Change
			items[idx].ChangePercent = q.ChangePercent
			items[idx].Open = q.Open
			items[idx].DayHigh = q.DayHigh
			items[idx].DayLow = q.DayLow
			items[idx].Week52High = q.Week52High
			items[idx].Week52Low = q.Week52Low
			items[idx].Volume = q.Volume
			items[idx].Currency = q.Currency
			items[idx].PriceAvailable = true
		}(i)
	}
	wg.Wait()
}

func cachedQuote(symbol string) *finance.Quote {
	cacheKey := "price:" + symbol
	var cached finance.Quote
	if found, _ := cache.Get(cacheKey, &cached); found && cached.Price > 0 {
		return &cached
	}

	q, err := finance.GetQuoteWithTimeout(symbol, 8*time.Second)
	if err != nil || q == nil {
		respond.LogError("watchlist", "fetch quote "+symbol, err)
		return nil
	}
	if err := cache.Set(cacheKey, q, quoteCacheTTL); err != nil {
		respond.LogError("watchlist", "cache set", err)
	}
	return q
}

func addWatchlist(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req addWatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	req.Symbol = finance.NormalizeStoredSymbol(req.Symbol)
	if req.Symbol == "" {
		respond.Error(w, http.StatusBadRequest, "Sembol gerekli")
		return
	}

	// Validate against the data provider before writing: an unresolvable
	// symbol would otherwise become a permanent row that never shows a price.
	quote, ok := finance.IsKnownSymbol(req.Symbol)
	if !ok {
		respond.Error(w, http.StatusBadRequest,
			req.Symbol+" için fiyat verisi bulunamadı, sembolü kontrol edin")
		return
	}

	symbolName := strings.TrimSpace(req.SymbolName)
	if symbolName == "" {
		symbolName = quote.Name
	}
	if symbolName == "" {
		symbolName = req.Symbol
	}
	exchange := strings.TrimSpace(req.Exchange)
	if exchange == "" {
		exchange = quote.Exchange
	}
	if exchange == "" {
		exchange = "BIST"
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/add", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	var itemCount int
	if err := pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM watchlist WHERE user_id = $1", claims.UserID,
	).Scan(&itemCount); err != nil {
		respond.LogError("watchlist/add", "count items", err)
		respond.Error(w, http.StatusInternalServerError, "İzleme listesi kontrol edilemedi")
		return
	}
	if itemCount >= maxWatchlistItems {
		respond.Error(w, http.StatusConflict, "İzleme listeniz dolu, önce bazı hisseleri çıkarın")
		return
	}

	var exists bool
	variants := finance.SymbolVariants(req.Symbol)
	switch len(variants) {
	case 2:
		err = pool.QueryRow(ctx,
			`SELECT EXISTS(
				SELECT 1 FROM watchlist
				WHERE user_id = $1 AND (symbol = $2 OR symbol = $3)
			)`,
			claims.UserID, variants[0], variants[1],
		).Scan(&exists)
	default:
		err = pool.QueryRow(ctx,
			`SELECT EXISTS(
				SELECT 1 FROM watchlist WHERE user_id = $1 AND symbol = $2
			)`,
			claims.UserID, req.Symbol,
		).Scan(&exists)
	}
	if err != nil {
		respond.LogError("watchlist/add", "check exists", err)
		respond.Error(w, http.StatusInternalServerError, "İzleme listesi kontrol edilemedi")
		return
	}
	if exists {
		respond.Error(w, http.StatusConflict, "Bu hisse zaten izleme listenizde")
		return
	}

	id := uuid.New()
	tag, err := pool.Exec(ctx,
		`INSERT INTO watchlist (id, user_id, symbol, symbol_name, exchange, notes, display_order)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 ON CONFLICT (user_id, symbol) DO NOTHING`,
		id, claims.UserID, req.Symbol, symbolName, exchange,
		nullStr(req.Notes), itemCount,
	)
	if err != nil {
		respond.LogError("watchlist/add", "insert watchlist", err)
		respond.Error(w, http.StatusInternalServerError, "İzleme listesine eklenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusConflict, "Bu hisse zaten izleme listenizde")
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]any{
		"id":         id,
		"symbol":     req.Symbol,
		"symbolName": symbolName,
		"exchange":   exchange,
	})
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}
