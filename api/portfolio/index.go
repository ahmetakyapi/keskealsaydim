package handler

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
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

const maxHoldingsPerUser = 200

type addRequest struct {
	Symbol     string  `json:"symbol"`
	SymbolName string  `json:"symbolName"`
	Exchange   string  `json:"exchange"`
	Quantity   float64 `json:"quantity"`
	BuyPrice   float64 `json:"buyPrice"`
	BuyDate    string  `json:"buyDate"`
	Commission float64 `json:"buyCommission"`
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
		getPortfolio(w, claims)
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
	Commission    float64   `json:"buyCommission"`
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
	Stale         bool      `json:"stale"`
	CreatedAt     time.Time `json:"createdAt"`
}

type closedPosition struct {
	ID          uuid.UUID `json:"id"`
	Symbol      string    `json:"symbol"`
	SymbolName  string    `json:"symbolName"`
	Quantity    float64   `json:"quantity"`
	BuyPrice    float64   `json:"buyPrice"`
	BuyDate     string    `json:"buyDate"`
	SellPrice   float64   `json:"sellPrice"`
	SellDate    string    `json:"sellDate"`
	Currency    string    `json:"currency"`
	Profit      float64   `json:"profit"`
	ProfitPct   float64   `json:"profitPercent"`
	HoldingDays int       `json:"holdingDays"`
}

func getPortfolio(w http.ResponseWriter, claims *auth.Claims) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/get", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}
	ctx, cancel := respond.Ctx()
	defer cancel()

	rows, err := pool.Query(ctx,
		`SELECT id, symbol, COALESCE(symbol_name, symbol), COALESCE(exchange, 'BIST'),
		        quantity, buy_price, buy_date, COALESCE(buy_commission, 0),
		        notes, status::text, COALESCE(currency, 'TRY'), created_at
		   FROM investments
		  WHERE user_id = $1 AND status <> 'CLOSED'
		  ORDER BY created_at DESC`,
		claims.UserID,
	)
	if err != nil {
		respond.LogError("portfolio/get", "query investments", err)
		respond.Error(w, http.StatusInternalServerError, "Portföy getirilemedi")
		return
	}
	defer rows.Close()

	holdings := make([]holding, 0)
	symbolSet := make(map[string]bool)
	for rows.Next() {
		var h holding
		var buyDate time.Time
		if err := rows.Scan(
			&h.ID, &h.Symbol, &h.SymbolName, &h.Exchange,
			&h.Quantity, &h.BuyPrice, &buyDate, &h.Commission,
			&h.Notes, &h.Status, &h.Currency, &h.CreatedAt,
		); err != nil {
			respond.LogError("portfolio/get", "scan row", err)
			continue
		}
		h.Symbol = finance.NormalizeStoredSymbol(h.Symbol)
		h.BuyDate = buyDate.Format("2006-01-02")
		holdings = append(holdings, h)
		symbolSet[h.Symbol] = true
	}
	if err := rows.Err(); err != nil {
		respond.LogError("portfolio/get", "iterate rows", err)
	}

	quotes := fetchQuotes(symbolSet)

	// A quote's own currency is authoritative; the stored `currency` column is
	// only a fallback for symbols whose quote could not be fetched.
	currencies := make(map[string]bool)
	for i := range holdings {
		if q := quotes[holdings[i].Symbol]; q != nil && q.Currency != "" {
			holdings[i].Currency = q.Currency
		}
		currencies[holdings[i].Currency] = true
	}
	rates := ratesFor(currencies)

	// Every total is expressed in TRY. Without this a USD position would be
	// added to a TRY total at face value and overstate nothing but understate
	// the position by the whole exchange rate.
	var totalValue, totalCost, dailyPnL float64
	for i := range holdings {
		h := &holdings[i]
		rate, known := rates[h.Currency]
		if !known {
			rate = 1
		}

		q := quotes[h.Symbol]
		if q != nil && q.Price > 0 {
			h.CurrentPrice = q.Price
			h.ChangePercent = q.ChangePercent
			h.DailyChange = round2(q.Change * h.Quantity * rate)
		} else {
			// No live quote: fall back to cost so the row shows a neutral
			// position instead of a fabricated gain or a zero.
			h.CurrentPrice = h.BuyPrice
			h.Stale = true
		}

		h.CurrentValue = round2(h.CurrentPrice * h.Quantity * rate)
		h.TotalCost = round2(h.BuyPrice*h.Quantity*rate + h.Commission)
		h.Profit = round2(h.CurrentValue - h.TotalCost)
		if h.TotalCost > 0 {
			h.ProfitPercent = round2(h.Profit / h.TotalCost * 100)
		}

		totalValue += h.CurrentValue
		totalCost += h.TotalCost
		dailyPnL += h.DailyChange
	}

	for i := range holdings {
		if totalValue > 0 {
			holdings[i].Weight = round2(holdings[i].CurrentValue / totalValue * 100)
		}
	}

	closed, realizedProfit := closedPositions(ctx, pool, claims.UserID, rates)

	totalProfit := round2(totalValue - totalCost)
	totalProfitPct := 0.0
	if totalCost > 0 {
		totalProfitPct = round2(totalProfit / totalCost * 100)
	}
	dailyChangePct := 0.0
	if previous := totalValue - dailyPnL; previous > 0 {
		dailyChangePct = round2(dailyPnL / previous * 100)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"holdings":           holdings,
		"closedPositions":    closed,
		"totalValue":         round2(totalValue),
		"totalCost":          round2(totalCost),
		"totalProfit":        totalProfit,
		"totalProfitPercent": totalProfitPct,
		"realizedProfit":     round2(realizedProfit),
		"dailyChange":        round2(dailyPnL),
		"dailyChangePercent": dailyChangePct,
		"totalInvestments":   len(holdings) + len(closed),
		"openInvestments":    len(holdings),
		"closedInvestments":  len(closed),
		"baseCurrency":       finance.BaseCurrency,
	})
}

// fetchQuotes resolves one quote per distinct symbol, concurrently.
func fetchQuotes(symbols map[string]bool) map[string]*finance.Quote {
	quotes := make(map[string]*finance.Quote, len(symbols))
	if len(symbols) == 0 {
		return quotes
	}

	var (
		mu sync.Mutex
		wg sync.WaitGroup
	)
	for sym := range symbols {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			q, err := finance.GetQuoteWithTimeout(s, 8*time.Second)
			if err != nil {
				respond.LogError("portfolio/get", "fetch quote "+s, err)
				return
			}
			mu.Lock()
			quotes[s] = q
			mu.Unlock()
		}(sym)
	}
	wg.Wait()

	return quotes
}

func ratesFor(currencies map[string]bool) map[string]float64 {
	list := make([]string, 0, len(currencies))
	for c := range currencies {
		list = append(list, c)
	}
	return finance.SpotRatesToTRY(list)
}

func closedPositions(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID, rates map[string]float64) ([]closedPosition, float64) {
	rows, err := pool.Query(ctx,
		`SELECT id, symbol, COALESCE(symbol_name, symbol), quantity, buy_price, buy_date,
		        sell_price, sell_date, COALESCE(currency, 'TRY'),
		        COALESCE(buy_commission, 0), COALESCE(sell_commission, 0)
		   FROM investments
		  WHERE user_id = $1 AND status = 'CLOSED'
		    AND sell_price IS NOT NULL AND sell_date IS NOT NULL
		  ORDER BY sell_date DESC
		  LIMIT 100`,
		userID,
	)
	if err != nil {
		respond.LogError("portfolio/get", "query closed", err)
		return []closedPosition{}, 0
	}
	defer rows.Close()

	positions := make([]closedPosition, 0)
	realized := 0.0
	for rows.Next() {
		var (
			p                     closedPosition
			buyDate, sellDate     time.Time
			buyComm, sellComm     float64
			sellPrice, buyPriceIn float64
		)
		if err := rows.Scan(&p.ID, &p.Symbol, &p.SymbolName, &p.Quantity, &buyPriceIn, &buyDate,
			&sellPrice, &sellDate, &p.Currency, &buyComm, &sellComm); err != nil {
			respond.LogError("portfolio/get", "scan closed", err)
			continue
		}

		rate, known := rates[p.Currency]
		if !known {
			if r, err := finance.SpotRateToTRY(p.Currency); err == nil {
				rate = r
			} else {
				rate = 1
			}
		}

		p.Symbol = finance.NormalizeStoredSymbol(p.Symbol)
		p.BuyPrice = buyPriceIn
		p.SellPrice = sellPrice
		p.BuyDate = buyDate.Format("2006-01-02")
		p.SellDate = sellDate.Format("2006-01-02")
		p.HoldingDays = int(sellDate.Sub(buyDate).Hours() / 24)

		cost := buyPriceIn*p.Quantity*rate + buyComm
		proceeds := sellPrice*p.Quantity*rate - sellComm
		p.Profit = round2(proceeds - cost)
		if cost > 0 {
			p.ProfitPct = round2(p.Profit / cost * 100)
		}

		realized += p.Profit
		positions = append(positions, p)
	}

	return positions, realized
}

func addInvestment(w http.ResponseWriter, r *http.Request, claims *auth.Claims) {
	var req addRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	req.Symbol = finance.NormalizeStoredSymbol(req.Symbol)
	if req.Symbol == "" {
		respond.Error(w, http.StatusBadRequest, "Sembol gerekli")
		return
	}
	if req.Quantity <= 0 {
		respond.Error(w, http.StatusBadRequest, "Adet pozitif olmalı")
		return
	}
	if req.BuyPrice <= 0 {
		respond.Error(w, http.StatusBadRequest, "Alış fiyatı pozitif olmalı")
		return
	}
	if req.Commission < 0 {
		respond.Error(w, http.StatusBadRequest, "Komisyon negatif olamaz")
		return
	}
	if req.BuyDate == "" {
		req.BuyDate = time.Now().Format("2006-01-02")
	}
	buyDate, err := time.Parse("2006-01-02", req.BuyDate)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz alış tarihi formatı")
		return
	}
	if buyDate.After(time.Now().AddDate(0, 0, 1)) {
		respond.Error(w, http.StatusBadRequest, "Alış tarihi gelecekte olamaz")
		return
	}
	if req.Exchange == "" {
		req.Exchange = "BIST"
	}

	// Resolve the traded currency once at write time so historical rows stay
	// correct even if the symbol later changes venue.
	currency := finance.BaseCurrency
	if q, quoteErr := finance.GetQuoteWithTimeout(req.Symbol, 6*time.Second); quoteErr == nil && q != nil {
		if q.Currency != "" {
			currency = q.Currency
		}
		if strings.TrimSpace(req.SymbolName) == "" {
			req.SymbolName = q.Name
		}
		if q.Exchange != "" {
			req.Exchange = q.Exchange
		}
	}
	if strings.TrimSpace(req.SymbolName) == "" {
		req.SymbolName = req.Symbol
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/add", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	var openCount int
	if err := pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM investments WHERE user_id = $1 AND status <> 'CLOSED'",
		claims.UserID,
	).Scan(&openCount); err != nil {
		respond.LogError("portfolio/add", "count holdings", err)
		respond.Error(w, http.StatusInternalServerError, "Portföy kontrol edilemedi")
		return
	}
	if openCount >= maxHoldingsPerUser {
		respond.Error(w, http.StatusConflict, "Portföyünüz dolu, önce bazı pozisyonları kapatın")
		return
	}

	id := uuid.New()
	if _, err = pool.Exec(ctx,
		`INSERT INTO investments
		   (id, user_id, symbol, symbol_name, exchange, quantity, buy_price, buy_date,
		    buy_commission, currency, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, claims.UserID, req.Symbol, req.SymbolName, req.Exchange,
		req.Quantity, req.BuyPrice, req.BuyDate, req.Commission, currency,
		nullStr(req.Notes),
	); err != nil {
		respond.LogError("portfolio/add", "insert investment", err)
		respond.Error(w, http.StatusInternalServerError, "Yatırım eklenemedi")
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]any{
		"id":       id,
		"symbol":   req.Symbol,
		"currency": currency,
	})
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
