package handler

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

type addRequest struct {
	Symbol     string  `json:"symbol"`
	SymbolName string  `json:"symbolName"`
	Exchange   string  `json:"exchange"`
	Quantity   float64 `json:"quantity"`
	BuyPrice   float64 `json:"buyPrice"`
	BuyDate    string  `json:"buyDate"`
	Notes      string  `json:"notes"`
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
		getPortfolio(w, r, claims)
	case http.MethodPost:
		addInvestment(w, r, claims)
	default:
		respond.MethodNotAllowed(w)
	}
}

type holding struct {
	ID            uuid.UUID `json:"id"`
	Symbol        string    `json:"symbol"`
	SymbolName    string    `json:"symbolName"`
	Exchange      string    `json:"exchange"`
	Quantity      float64   `json:"quantity"`
	BuyPrice      float64   `json:"buyPrice"`
	BuyDate       string    `json:"buyDate"`
	Notes         *string   `json:"notes"`
	Status        string    `json:"status"`
	Currency      string    `json:"currency"`
	CurrentPrice  float64   `json:"currentPrice"`
	CurrentValue  float64   `json:"currentValue"`
	TotalCost     float64   `json:"totalCost"`
	Profit        float64   `json:"profit"`
	ProfitPercent float64   `json:"profitPercent"`
	ChangePercent float64   `json:"changePercent"`
	DailyChange   float64   `json:"dailyChange"`
	Weight        float64   `json:"weight"`
	CreatedAt     time.Time `json:"createdAt"`
}

func getPortfolio(w http.ResponseWriter, _ *http.Request, claims *auth.Claims) {
	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx := context.Background()

	rows, err := pool.Query(ctx,
		`SELECT id, symbol, symbol_name, exchange, quantity, buy_price, buy_date,
		        notes, status, currency, created_at
		   FROM investments
		  WHERE user_id = $1 AND status = 'OPEN'
		  ORDER BY created_at DESC`,
		claims.UserID,
	)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Portföy getirilemedi")
		return
	}
	defer rows.Close()

	holdings := make([]holding, 0)
	symbolSet := make(map[string]bool)
	for rows.Next() {
		var h holding
		var buyDate interface{}
		if err := rows.Scan(
			&h.ID, &h.Symbol, &h.SymbolName, &h.Exchange,
			&h.Quantity, &h.BuyPrice, &buyDate,
			&h.Notes, &h.Status, &h.Currency, &h.CreatedAt,
		); err != nil {
			continue
		}
		h.Symbol = finance.NormalizeStoredSymbol(h.Symbol)
		if t, ok := buyDate.(time.Time); ok {
			h.BuyDate = t.Format("2006-01-02")
		}
		holdings = append(holdings, h)
		symbolSet[h.Symbol] = true
	}

	// Fetch current quotes concurrently
	type quoteRes struct {
		sym string
		q   *finance.Quote
	}
	ch := make(chan quoteRes, len(symbolSet))
	var wg sync.WaitGroup
	for sym := range symbolSet {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			q, err := finance.GetQuote(s)
			if err == nil {
				ch <- quoteRes{s, q}
			} else {
				ch <- quoteRes{s, nil}
			}
		}(sym)
	}
	wg.Wait()
	close(ch)

	quotes := make(map[string]*finance.Quote)
	for r := range ch {
		quotes[r.sym] = r.q
	}

	// Enrich holdings with current prices
	var totalValue, totalCost, dailyPnL float64
	for i, h := range holdings {
		q := quotes[h.Symbol]
		if q != nil {
			holdings[i].CurrentPrice = q.Price
			holdings[i].ChangePercent = q.ChangePercent
			holdings[i].DailyChange = q.Change * h.Quantity
		} else {
			holdings[i].CurrentPrice = h.BuyPrice
		}
		holdings[i].CurrentValue = round2(holdings[i].CurrentPrice * h.Quantity)
		holdings[i].TotalCost = round2(h.BuyPrice * h.Quantity)
		holdings[i].Profit = round2(holdings[i].CurrentValue - holdings[i].TotalCost)
		if holdings[i].TotalCost > 0 {
			holdings[i].ProfitPercent = round2(holdings[i].Profit / holdings[i].TotalCost * 100)
		}
		totalValue += holdings[i].CurrentValue
		totalCost += holdings[i].TotalCost
		dailyPnL += holdings[i].DailyChange
	}

	// Compute weights
	for i := range holdings {
		if totalValue > 0 {
			holdings[i].Weight = round2(holdings[i].CurrentValue / totalValue * 100)
		}
	}

	totalProfit := round2(totalValue - totalCost)
	totalProfitPct := 0.0
	if totalCost > 0 {
		totalProfitPct = round2(totalProfit / totalCost * 100)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"holdings":           holdings,
		"totalValue":         round2(totalValue),
		"totalCost":          round2(totalCost),
		"totalProfit":        totalProfit,
		"totalProfitPercent": totalProfitPct,
		"dailyChange":        round2(dailyPnL),
		"dailyChangePercent": func() float64 {
			if totalValue-dailyPnL > 0 {
				return round2(dailyPnL / (totalValue - dailyPnL) * 100)
			}
			return 0
		}(),
		"totalInvestments":  len(holdings),
		"openInvestments":   len(holdings),
		"closedInvestments": 0,
	})
}

func addInvestment(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req addRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	req.Symbol = finance.NormalizeStoredSymbol(req.Symbol)
	if req.Symbol == "" {
		respond.Error(w, http.StatusBadRequest, "symbol gerekli")
		return
	}
	if req.Quantity <= 0 || req.BuyPrice <= 0 {
		respond.Error(w, http.StatusBadRequest, "Miktar ve alış fiyatı pozitif olmalı")
		return
	}
	if req.BuyDate == "" {
		req.BuyDate = time.Now().Format("2006-01-02")
	}
	if req.Exchange == "" {
		req.Exchange = "BIST"
	}

	pool, err := db.Get()
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	id := uuid.New()
	_, err = pool.Exec(context.Background(),
		`INSERT INTO investments (id, user_id, symbol, symbol_name, exchange, quantity, buy_price, buy_date, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, claims.UserID, req.Symbol, req.SymbolName, req.Exchange,
		req.Quantity, req.BuyPrice, req.BuyDate,
		nullStr(req.Notes),
	)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "Yatırım eklenemedi")
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

func round2(v float64) float64 { return math.Round(v*100) / 100 }
