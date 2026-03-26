package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

type compareRequest struct {
	SymbolA      string  `json:"symbolA"`
	SymbolAName  string  `json:"symbolAName"`
	SymbolB      string  `json:"symbolB"`
	SymbolBName  string  `json:"symbolBName"`
	StartDate    string  `json:"startDate"`
	EndDate      string  `json:"endDate"`
	Amount       float64 `json:"amount"`
	AmountType   string  `json:"amountType"` // MONEY or QUANTITY
	Title        string  `json:"title"`
	Notes        string  `json:"notes"`
	SaveScenario bool    `json:"saveScenario"`
}

type symbolResult struct {
	StartPrice    float64 `json:"startPrice"`
	EndPrice      float64 `json:"endPrice"`
	ChangePercent float64 `json:"changePercent"`
	Quantity      float64 `json:"quantity"`
	StartValue    float64 `json:"startValue"`
	EndValue      float64 `json:"endValue"`
	Profit        float64 `json:"profit"`
	ProfitPercent float64 `json:"profitPercent"`
}

type differenceResult struct {
	AbsoluteTL        float64 `json:"absoluteTL"`
	PercentagePoints  float64 `json:"percentagePoints"`
	WinnerSymbol      string  `json:"winnerSymbol"`
	MissedOpportunity bool    `json:"missedOpportunity"`
}

type metricsResult struct {
	SymbolAVolatility float64 `json:"symbolAVolatility"`
	SymbolBVolatility float64 `json:"symbolBVolatility"`
	Correlation       float64 `json:"correlation"`
}

type resultJSON struct {
	SymbolA    symbolResult     `json:"symbolA"`
	SymbolB    symbolResult     `json:"symbolB"`
	Difference differenceResult `json:"difference"`
	Metrics    metricsResult    `json:"metrics"`
}

type compareResponse struct {
	ScenarioID  *string    `json:"scenarioId,omitempty"`
	ShareToken  *string    `json:"shareToken,omitempty"`
	SymbolA     string     `json:"symbolA"`
	SymbolAName string     `json:"symbolAName"`
	SymbolB     string     `json:"symbolB"`
	SymbolBName string     `json:"symbolBName"`
	StartDate   string     `json:"startDate"`
	EndDate     string     `json:"endDate"`
	Amount      float64    `json:"amount"`
	AmountType  string     `json:"amountType"`
	Title       string     `json:"title,omitempty"`
	Result      resultJSON `json:"result"`
}

var getHistory = finance.GetHistory

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		respond.MethodNotAllowed(w)
		return
	}

	var req compareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	req.SymbolA = finance.NormalizeStoredSymbol(req.SymbolA)
	req.SymbolB = finance.NormalizeStoredSymbol(req.SymbolB)
	if req.SymbolA == "" || req.SymbolB == "" {
		respond.Error(w, http.StatusBadRequest, "symbolA ve symbolB gerekli")
		return
	}
	if req.StartDate == "" {
		respond.Error(w, http.StatusBadRequest, "startDate gerekli")
		return
	}
	if req.Amount <= 0 {
		req.Amount = 1000
	}
	if req.AmountType != "QUANTITY" {
		req.AmountType = "MONEY"
	}
	if req.EndDate == "" {
		req.EndDate = time.Now().Format("2006-01-02")
	}

	// Fetch history for both symbols concurrently
	type histRes struct {
		h   *finance.History
		err error
	}
	chA := make(chan histRes, 1)
	chB := make(chan histRes, 1)
	go func() {
		h, err := getHistory(req.SymbolA, req.StartDate, req.EndDate, "1d")
		chA <- histRes{h, err}
	}()
	go func() {
		h, err := getHistory(req.SymbolB, req.StartDate, req.EndDate, "1d")
		chB <- histRes{h, err}
	}()
	rA, rB := <-chA, <-chB

	if rA.err != nil {
		respond.Error(w, http.StatusBadRequest, "Sembol A için veri bulunamadı: "+req.SymbolA)
		return
	}
	if rB.err != nil {
		respond.Error(w, http.StatusBadRequest, "Sembol B için veri bulunamadı: "+req.SymbolB)
		return
	}
	if len(rA.h.Data) < 2 || len(rB.h.Data) < 2 {
		respond.Error(w, http.StatusBadRequest, "Yeterli geçmiş veri bulunamadı")
		return
	}

	// Prices
	startA, endA := rA.h.Data[0].Close, rA.h.Data[len(rA.h.Data)-1].Close
	startB, endB := rB.h.Data[0].Close, rB.h.Data[len(rB.h.Data)-1].Close

	// Quantities and values
	var qtyA, qtyB float64
	if req.AmountType == "QUANTITY" {
		qtyA, qtyB = req.Amount, req.Amount
	} else {
		qtyA = req.Amount / startA
		qtyB = req.Amount / startB
	}
	startValA, endValA := qtyA*startA, qtyA*endA
	startValB, endValB := qtyB*startB, qtyB*endB
	profitA, profitB := endValA-startValA, endValB-startValB
	profitPctA := profitA / startValA * 100
	profitPctB := profitB / startValB * 100

	winner := "A"
	if profitPctB > profitPctA {
		winner = "B"
	}

	result := resultJSON{
		SymbolA: symbolResult{
			StartPrice:    r2(startA),
			EndPrice:      r2(endA),
			ChangePercent: r2((endA - startA) / startA * 100),
			Quantity:      r4(qtyA),
			StartValue:    r2(startValA),
			EndValue:      r2(endValA),
			Profit:        r2(profitA),
			ProfitPercent: r2(profitPctA),
		},
		SymbolB: symbolResult{
			StartPrice:    r2(startB),
			EndPrice:      r2(endB),
			ChangePercent: r2((endB - startB) / startB * 100),
			Quantity:      r4(qtyB),
			StartValue:    r2(startValB),
			EndValue:      r2(endValB),
			Profit:        r2(profitB),
			ProfitPercent: r2(profitPctB),
		},
		Difference: differenceResult{
			AbsoluteTL:        r2(math.Abs(endValB - endValA)),
			PercentagePoints:  r2(profitPctB - profitPctA),
			WinnerSymbol:      winner,
			MissedOpportunity: winner == "B",
		},
		Metrics: computeMetrics(rA.h.Data, rB.h.Data),
	}

	symbolAName := req.SymbolAName
	if symbolAName == "" {
		symbolAName = req.SymbolA
	}
	symbolBName := req.SymbolBName
	if symbolBName == "" {
		symbolBName = req.SymbolB
	}

	resp := compareResponse{
		SymbolA:     req.SymbolA,
		SymbolAName: symbolAName,
		SymbolB:     req.SymbolB,
		SymbolBName: symbolBName,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Amount:      req.Amount,
		AmountType:  req.AmountType,
		Title:       req.Title,
		Result:      result,
	}

	// Save to DB if authenticated and requested
	claims, authErr := auth.FromRequest(r)
	if authErr == nil && req.SaveScenario {
		pool, dbErr := db.Get()
		if dbErr == nil {
			ctx, cancel := respond.Ctx()
			defer cancel()
			shareToken := randomToken()
			resultBytes, _ := json.Marshal(result)
			scenarioID := uuid.New()
			_, saveErr := pool.Exec(ctx,
				`INSERT INTO comparison_scenarios
				  (id, user_id, symbol_a, symbol_a_name, symbol_b, symbol_b_name,
				   start_date, end_date, amount, amount_type, result_json, title, notes, share_token)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
				scenarioID, claims.UserID,
				req.SymbolA, symbolAName, req.SymbolB, symbolBName,
				req.StartDate, req.EndDate, req.Amount, req.AmountType,
				resultBytes, req.Title, req.Notes, shareToken,
			)
			if saveErr == nil {
				sid := scenarioID.String()
				resp.ScenarioID = &sid
				resp.ShareToken = &shareToken
			}
		}
	}

	respond.JSON(w, http.StatusOK, resp)
}

// computeMetrics calculates annualized volatility for each symbol and their correlation.
func computeMetrics(dataA, dataB []finance.HistoryPoint) metricsResult {
	returnsA := logReturns(dataA)
	returnsB := logReturns(dataB)

	n := min(len(returnsA), len(returnsB))

	volA := annualizedVol(returnsA) * 100
	volB := annualizedVol(returnsB) * 100
	corr := 0.0
	if n >= 2 {
		corr = pearson(returnsA[:n], returnsB[:n])
	}

	return metricsResult{
		SymbolAVolatility: r2(volA),
		SymbolBVolatility: r2(volB),
		Correlation:       r4(corr),
	}
}

func logReturns(data []finance.HistoryPoint) []float64 {
	if len(data) < 2 {
		return nil
	}
	out := make([]float64, 0, len(data)-1)
	for i := 1; i < len(data); i++ {
		if data[i-1].Close > 0 && data[i].Close > 0 {
			out = append(out, math.Log(data[i].Close/data[i-1].Close))
		}
	}
	return out
}

func annualizedVol(returns []float64) float64 {
	n := len(returns)
	if n < 2 {
		return 0
	}
	mean := 0.0
	for _, r := range returns {
		mean += r
	}
	mean /= float64(n)
	variance := 0.0
	for _, r := range returns {
		d := r - mean
		variance += d * d
	}
	variance /= float64(n - 1)
	return math.Sqrt(variance) * math.Sqrt(252)
}

func pearson(a, b []float64) float64 {
	n := len(a)
	if n != len(b) || n < 2 {
		return 0
	}
	meanA, meanB := 0.0, 0.0
	for i := range a {
		meanA += a[i]
		meanB += b[i]
	}
	meanA /= float64(n)
	meanB /= float64(n)

	num, varA, varB := 0.0, 0.0, 0.0
	for i := range a {
		dA := a[i] - meanA
		dB := b[i] - meanB
		num += dA * dB
		varA += dA * dA
		varB += dB * dB
	}
	if varA == 0 || varB == 0 {
		return 0
	}
	return num / math.Sqrt(varA*varB)
}

func randomToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func r2(v float64) float64 { return math.Round(v*100) / 100 }
func r4(v float64) float64 { return math.Round(v*10000) / 10000 }
