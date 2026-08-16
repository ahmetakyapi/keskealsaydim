package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

type updateRequest struct {
	SymbolName *string  `json:"symbolName"`
	Quantity   *float64 `json:"quantity"`
	BuyPrice   *float64 `json:"buyPrice"`
	BuyDate    *string  `json:"buyDate"`
	Commission *float64 `json:"buyCommission"`
	Notes      *string  `json:"notes"`
}

type sellRequest struct {
	SellPrice  *float64 `json:"sellPrice"`
	SellDate   *string  `json:"sellDate"`
	Quantity   *float64 `json:"quantity"`
	Commission *float64 `json:"sellCommission"`
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

	investID, err := uuid.Parse(strings.TrimSpace(r.URL.Query().Get("id")))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz yatırım ID")
		return
	}

	switch r.Method {
	case http.MethodPut, http.MethodPatch:
		if r.URL.Query().Get("action") == "sell" {
			sellInvestment(w, r, claims, investID)
			return
		}
		updateInvestment(w, r, claims, investID)
	case http.MethodDelete:
		deleteInvestment(w, claims, investID)
	default:
		respond.MethodNotAllowed(w)
	}
}

func updateInvestment(w http.ResponseWriter, r *http.Request, claims *auth.Claims, investID uuid.UUID) {
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	sets := make([]string, 0, 6)
	args := make([]any, 0, 8)

	if req.Quantity != nil {
		if *req.Quantity <= 0 {
			respond.Error(w, http.StatusBadRequest, "Adet pozitif olmalı")
			return
		}
		args = append(args, *req.Quantity)
		sets = append(sets, fmt.Sprintf("quantity = $%d", len(args)))
	}
	if req.BuyPrice != nil {
		if *req.BuyPrice <= 0 {
			respond.Error(w, http.StatusBadRequest, "Alış fiyatı pozitif olmalı")
			return
		}
		args = append(args, *req.BuyPrice)
		sets = append(sets, fmt.Sprintf("buy_price = $%d", len(args)))
	}
	if req.Commission != nil {
		if *req.Commission < 0 {
			respond.Error(w, http.StatusBadRequest, "Komisyon negatif olamaz")
			return
		}
		args = append(args, *req.Commission)
		sets = append(sets, fmt.Sprintf("buy_commission = $%d", len(args)))
	}
	if req.BuyDate != nil {
		buyDate, err := time.Parse("2006-01-02", *req.BuyDate)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "Geçersiz alış tarihi formatı")
			return
		}
		if buyDate.After(time.Now().AddDate(0, 0, 1)) {
			respond.Error(w, http.StatusBadRequest, "Alış tarihi gelecekte olamaz")
			return
		}
		args = append(args, *req.BuyDate)
		sets = append(sets, fmt.Sprintf("buy_date = $%d", len(args)))
	}
	if req.SymbolName != nil {
		name := strings.TrimSpace(*req.SymbolName)
		if name == "" {
			respond.Error(w, http.StatusBadRequest, "Hisse adı boş olamaz")
			return
		}
		args = append(args, name)
		sets = append(sets, fmt.Sprintf("symbol_name = $%d", len(args)))
	}
	if req.Notes != nil {
		args = append(args, nullStr(*req.Notes))
		sets = append(sets, fmt.Sprintf("notes = $%d", len(args)))
	}

	if len(sets) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	args = append(args, investID, claims.UserID)
	query := fmt.Sprintf(
		"UPDATE investments SET %s WHERE id = $%d AND user_id = $%d AND status <> 'CLOSED'",
		strings.Join(sets, ", "), len(args)-1, len(args),
	)

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("portfolio/item", "update investment", err)
		respond.Error(w, http.StatusInternalServerError, "Yatırım güncellenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Açık yatırım bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// sellInvestment closes a position, or splits it when only part is sold so the
// realised and unrealised legs stay separately accurate.
func sellInvestment(w http.ResponseWriter, r *http.Request, claims *auth.Claims, investID uuid.UUID) {
	var req sellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}
	if req.SellPrice == nil || *req.SellPrice <= 0 {
		respond.Error(w, http.StatusBadRequest, "Satış fiyatı pozitif olmalı")
		return
	}
	commission := 0.0
	if req.Commission != nil {
		if *req.Commission < 0 {
			respond.Error(w, http.StatusBadRequest, "Komisyon negatif olamaz")
			return
		}
		commission = *req.Commission
	}

	sellDate := time.Now().Format("2006-01-02")
	if req.SellDate != nil && *req.SellDate != "" {
		parsed, err := time.Parse("2006-01-02", *req.SellDate)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "Geçersiz satış tarihi formatı")
			return
		}
		if parsed.After(time.Now().AddDate(0, 0, 1)) {
			respond.Error(w, http.StatusBadRequest, "Satış tarihi gelecekte olamaz")
			return
		}
		sellDate = *req.SellDate
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		respond.LogError("portfolio/item", "begin tx", err)
		respond.Error(w, http.StatusInternalServerError, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	var (
		symbol, symbolName, exchange, currency string
		heldQty, buyPrice, buyCommission       float64
		buyDate                                time.Time
		notes                                  *string
	)
	err = tx.QueryRow(ctx,
		`SELECT symbol, COALESCE(symbol_name, symbol), COALESCE(exchange, 'BIST'),
		        COALESCE(currency, 'TRY'), quantity, buy_price, COALESCE(buy_commission, 0),
		        buy_date, notes
		   FROM investments
		  WHERE id = $1 AND user_id = $2 AND status <> 'CLOSED'
		  FOR UPDATE`,
		investID, claims.UserID,
	).Scan(&symbol, &symbolName, &exchange, &currency, &heldQty, &buyPrice,
		&buyCommission, &buyDate, &notes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "Açık yatırım bulunamadı")
			return
		}
		respond.LogError("portfolio/item", "load investment", err)
		respond.Error(w, http.StatusInternalServerError, "Yatırım getirilemedi")
		return
	}

	if buyDate.After(mustParseDate(sellDate)) {
		respond.Error(w, http.StatusBadRequest, "Satış tarihi alış tarihinden önce olamaz")
		return
	}

	soldQty := heldQty
	if req.Quantity != nil {
		soldQty = *req.Quantity
		if soldQty <= 0 {
			respond.Error(w, http.StatusBadRequest, "Satılacak adet pozitif olmalı")
			return
		}
		if soldQty > heldQty+1e-9 {
			respond.Error(w, http.StatusBadRequest, "Satılacak adet elinizdekinden fazla olamaz")
			return
		}
	}

	partial := soldQty < heldQty-1e-9
	closedID := investID

	if partial {
		remaining := heldQty - soldQty
		// Commissions follow the split so neither leg double-counts them.
		remainingCommission := round4(buyCommission * remaining / heldQty)
		soldCommission := round4(buyCommission - remainingCommission)

		if _, err := tx.Exec(ctx,
			"UPDATE investments SET quantity = $1, buy_commission = $2 WHERE id = $3",
			remaining, remainingCommission, investID,
		); err != nil {
			respond.LogError("portfolio/item", "shrink open position", err)
			respond.Error(w, http.StatusInternalServerError, "Pozisyon güncellenemedi")
			return
		}

		closedID = uuid.New()
		if _, err := tx.Exec(ctx,
			`INSERT INTO investments
			   (id, user_id, symbol, symbol_name, exchange, quantity, buy_price, buy_date,
			    buy_commission, sell_price, sell_date, sell_commission, status, currency, notes)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'CLOSED',$13,$14)`,
			closedID, claims.UserID, symbol, symbolName, exchange, soldQty, buyPrice,
			buyDate.Format("2006-01-02"), soldCommission, *req.SellPrice, sellDate,
			commission, currency, notes,
		); err != nil {
			respond.LogError("portfolio/item", "insert closed leg", err)
			respond.Error(w, http.StatusInternalServerError, "Satış kaydedilemedi")
			return
		}
	} else {
		if _, err := tx.Exec(ctx,
			`UPDATE investments
			    SET status = 'CLOSED', sell_price = $1, sell_date = $2, sell_commission = $3
			  WHERE id = $4 AND user_id = $5`,
			*req.SellPrice, sellDate, commission, investID, claims.UserID,
		); err != nil {
			respond.LogError("portfolio/item", "close position", err)
			respond.Error(w, http.StatusInternalServerError, "Satış kaydedilemedi")
			return
		}
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO investment_transactions
		   (id, investment_id, transaction_type, quantity, price, commission, transaction_date)
		 VALUES ($1, $2, 'SELL', $3, $4, $5, $6)`,
		uuid.New(), closedID, soldQty, *req.SellPrice, commission, sellDate,
	); err != nil {
		respond.LogError("portfolio/item", "insert transaction", err)
		respond.Error(w, http.StatusInternalServerError, "İşlem kaydedilemedi")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		respond.LogError("portfolio/item", "commit tx", err)
		respond.Error(w, http.StatusInternalServerError, "Satış tamamlanamadı")
		return
	}

	cost := buyPrice*soldQty + buyCommission*soldQty/heldQty
	proceeds := *req.SellPrice*soldQty - commission
	profit := round2(proceeds - cost)
	profitPct := 0.0
	if cost > 0 {
		profitPct = round2(profit / cost * 100)
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"id":            closedID,
		"symbol":        symbol,
		"soldQuantity":  soldQty,
		"partial":       partial,
		"profit":        profit,
		"profitPercent": profitPct,
		"currency":      currency,
	})
}

func deleteInvestment(w http.ResponseWriter, claims *auth.Claims, investID uuid.UUID) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("portfolio/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM investments WHERE id = $1 AND user_id = $2",
		investID, claims.UserID,
	)
	if err != nil {
		respond.LogError("portfolio/item", "delete investment", err)
		respond.Error(w, http.StatusInternalServerError, "Yatırım silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Yatırım bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func mustParseDate(value string) time.Time {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Now()
	}
	return parsed
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round4(v float64) float64 { return math.Round(v*10000) / 10000 }
