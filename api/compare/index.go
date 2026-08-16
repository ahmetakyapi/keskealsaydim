package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/finance"
	"keskealsaydim/pkg/respond"
)

// maxSeriesPoints caps the chart payload; longer ranges are evenly downsampled.
const maxSeriesPoints = 420

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
	Currency      string  `json:"currency"`
	MaxDrawdown   float64 `json:"maxDrawdown"`
	BestValue     float64 `json:"bestValue"`
	WorstValue    float64 `json:"worstValue"`
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
	TradingDays       int     `json:"tradingDays"`
}

// seriesPoint is one aligned day of both scenarios, valued in TRY.
type seriesPoint struct {
	Date   string  `json:"date"`
	ValueA float64 `json:"valueA"`
	ValueB float64 `json:"valueB"`
}

type resultJSON struct {
	SymbolA    symbolResult     `json:"symbolA"`
	SymbolB    symbolResult     `json:"symbolB"`
	Difference differenceResult `json:"difference"`
	Metrics    metricsResult    `json:"metrics"`
	Series     []seriesPoint    `json:"series"`
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

var (
	getHistory  = finance.GetHistory
	getRates    = finance.RateSeriesToTRY
	timeNow     = time.Now
	errNotFound = "Sembol için veri bulunamadı: "
)

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
	if req.SymbolA == req.SymbolB {
		respond.Error(w, http.StatusBadRequest, "Aynı sembolü kendisiyle karşılaştıramazsınız")
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
		req.EndDate = timeNow().Format("2006-01-02")
	}

	startT, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz başlangıç tarihi formatı")
		return
	}
	endT, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz bitiş tarihi formatı")
		return
	}
	if !startT.Before(endT) {
		respond.Error(w, http.StatusBadRequest, "Başlangıç tarihi bitiş tarihinden önce olmalı")
		return
	}
	if endT.After(timeNow().AddDate(0, 0, 1)) {
		respond.Error(w, http.StatusBadRequest, "Bitiş tarihi bugünden sonra olamaz")
		return
	}

	// Saving requires a session; say so instead of silently dropping the scenario.
	claims, authErr := auth.FromRequest(r)
	if req.SaveScenario && authErr != nil {
		respond.Error(w, http.StatusUnauthorized, "Senaryoyu kaydetmek için giriş yapmalısınız")
		return
	}

	// Fetch history for both symbols concurrently.
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

	if rA.err != nil || rA.h == nil {
		respond.LogError("compare", "history "+req.SymbolA, rA.err)
		respond.Error(w, http.StatusBadRequest, errNotFound+req.SymbolA)
		return
	}
	if rB.err != nil || rB.h == nil {
		respond.LogError("compare", "history "+req.SymbolB, rB.err)
		respond.Error(w, http.StatusBadRequest, errNotFound+req.SymbolB)
		return
	}
	if len(rA.h.Data) < 2 || len(rB.h.Data) < 2 {
		respond.Error(w, http.StatusBadRequest, "Bu tarih aralığında yeterli işlem verisi yok")
		return
	}

	// Both legs are valued in TRY so a Turkish investor sees a like-for-like
	// comparison; without this a USD stock's gain is understated by the FX move.
	seriesA, currencyA, err := toTRYSeries(rA.h, req.StartDate, req.EndDate)
	if err != nil {
		respond.LogError("compare", "fx "+req.SymbolA, err)
		respond.Error(w, http.StatusBadGateway, "Kur verisi alınamadı, lütfen tekrar deneyin")
		return
	}
	seriesB, currencyB, err := toTRYSeries(rB.h, req.StartDate, req.EndDate)
	if err != nil {
		respond.LogError("compare", "fx "+req.SymbolB, err)
		respond.Error(w, http.StatusBadGateway, "Kur verisi alınamadı, lütfen tekrar deneyin")
		return
	}

	aligned := alignSeries(seriesA, seriesB)
	if len(aligned) < 2 {
		respond.Error(w, http.StatusBadRequest, "İki sembolün ortak işlem günü bulunamadı")
		return
	}

	startA, endA := aligned[0].a, aligned[len(aligned)-1].a
	startB, endB := aligned[0].b, aligned[len(aligned)-1].b
	if startA <= 0 || startB <= 0 {
		respond.Error(w, http.StatusBadRequest, "Başlangıç tarihinde geçerli fiyat bulunamadı")
		return
	}

	var qtyA, qtyB float64
	if req.AmountType == "QUANTITY" {
		qtyA, qtyB = req.Amount, req.Amount
	} else {
		qtyA = req.Amount / startA
		qtyB = req.Amount / startB
	}

	points := make([]seriesPoint, 0, len(aligned))
	for _, p := range aligned {
		points = append(points, seriesPoint{
			Date:   p.date,
			ValueA: r2(qtyA * p.a),
			ValueB: r2(qtyB * p.b),
		})
	}
	statsA := summarize(points, func(p seriesPoint) float64 { return p.ValueA })
	statsB := summarize(points, func(p seriesPoint) float64 { return p.ValueB })
	points = downsample(points, maxSeriesPoints)

	startValA, endValA := qtyA*startA, qtyA*endA
	startValB, endValB := qtyB*startB, qtyB*endB
	profitA, profitB := endValA-startValA, endValB-startValB
	profitPctA := profitA / startValA * 100
	profitPctB := profitB / startValB * 100

	winner := "A"
	if profitPctB > profitPctA {
		winner = "B"
	}

	closesA := make([]float64, len(aligned))
	closesB := make([]float64, len(aligned))
	for i, p := range aligned {
		closesA[i] = p.a
		closesB[i] = p.b
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
			Currency:      currencyA,
			MaxDrawdown:   statsA.maxDrawdown,
			BestValue:     statsA.best,
			WorstValue:    statsA.worst,
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
			Currency:      currencyB,
			MaxDrawdown:   statsB.maxDrawdown,
			BestValue:     statsB.best,
			WorstValue:    statsB.worst,
		},
		Difference: differenceResult{
			AbsoluteTL:        r2(math.Abs(endValB - endValA)),
			PercentagePoints:  r2(profitPctB - profitPctA),
			WinnerSymbol:      winner,
			MissedOpportunity: winner == "B",
		},
		Metrics: computeMetrics(closesA, closesB),
		Series:  points,
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
		StartDate:   aligned[0].date,
		EndDate:     aligned[len(aligned)-1].date,
		Amount:      req.Amount,
		AmountType:  req.AmountType,
		Title:       req.Title,
		Result:      result,
	}

	if req.SaveScenario && claims != nil {
		pool, dbErr := db.Get()
		if dbErr != nil {
			respond.LogError("compare", "db connection", dbErr)
			respond.Error(w, http.StatusInternalServerError, "Senaryo kaydedilemedi")
			return
		}

		ctx, cancel := respond.Ctx()
		defer cancel()
		shareToken := randomToken()
		resultBytes, marshalErr := json.Marshal(result)
		if marshalErr != nil {
			respond.LogError("compare", "marshal result", marshalErr)
			respond.Error(w, http.StatusInternalServerError, "Senaryo kaydedilemedi")
			return
		}
		scenarioID := uuid.New()
		_, saveErr := pool.Exec(ctx,
			`INSERT INTO comparison_scenarios
			  (id, user_id, symbol_a, symbol_a_name, symbol_b, symbol_b_name,
			   start_date, end_date, amount, amount_type, result_json, title, notes, share_token)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
			scenarioID, claims.UserID,
			req.SymbolA, symbolAName, req.SymbolB, symbolBName,
			resp.StartDate, resp.EndDate, req.Amount, req.AmountType,
			resultBytes, nullStr(req.Title), nullStr(req.Notes), shareToken,
		)
		if saveErr != nil {
			respond.LogError("compare", "insert scenario", saveErr)
			respond.Error(w, http.StatusInternalServerError, "Senaryo kaydedilemedi")
			return
		}
		sid := scenarioID.String()
		resp.ScenarioID = &sid
		resp.ShareToken = &shareToken
	}

	respond.JSON(w, http.StatusOK, resp)
}

// ── Series handling ────────────────────────────────────────────────────────

type datedValue struct {
	date  string
	value float64
}

type alignedPoint struct {
	date string
	a    float64
	b    float64
}

// toTRYSeries converts a symbol's closes into TRY using the FX rate that
// applied on each day. Symbols already in TRY are returned untouched.
func toTRYSeries(h *finance.History, from, to string) ([]datedValue, string, error) {
	currency := h.Currency
	if currency == "" {
		currency = finance.BaseCurrency
	}

	rates := finance.ConstantRateSeries(1)
	if currency != finance.BaseCurrency {
		if !finance.SupportedCurrency(currency) {
			// Unknown currency: report it and leave the values unconverted
			// rather than inventing a rate.
			currency = h.Currency
		} else {
			loaded, err := getRates(currency, from, to)
			if err != nil {
				return nil, currency, err
			}
			rates = loaded
		}
	}

	out := make([]datedValue, 0, len(h.Data))
	for _, point := range h.Data {
		close := point.Close
		if point.AdjClose > 0 {
			close = point.AdjClose
		}
		if close <= 0 {
			continue
		}
		date := point.Date
		if len(date) > 10 {
			date = date[:10]
		}
		out = append(out, datedValue{date: date, value: close * rates.On(date)})
	}

	return out, currency, nil
}

// alignSeries produces one row per date where both symbols have a known price,
// forward-filling across the other market's holidays.
func alignSeries(a, b []datedValue) []alignedPoint {
	mapA := make(map[string]float64, len(a))
	mapB := make(map[string]float64, len(b))
	dateSet := make(map[string]struct{}, len(a)+len(b))
	for _, p := range a {
		mapA[p.date] = p.value
		dateSet[p.date] = struct{}{}
	}
	for _, p := range b {
		mapB[p.date] = p.value
		dateSet[p.date] = struct{}{}
	}

	dates := make([]string, 0, len(dateSet))
	for d := range dateSet {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	out := make([]alignedPoint, 0, len(dates))
	lastA, lastB := 0.0, 0.0
	for _, d := range dates {
		if v, ok := mapA[d]; ok {
			lastA = v
		}
		if v, ok := mapB[d]; ok {
			lastB = v
		}
		// Skip leading days before both series have started.
		if lastA <= 0 || lastB <= 0 {
			continue
		}
		out = append(out, alignedPoint{date: d, a: lastA, b: lastB})
	}

	return out
}

// downsample keeps the first and last point and evenly thins the middle.
func downsample(points []seriesPoint, maxPoints int) []seriesPoint {
	if maxPoints < 2 || len(points) <= maxPoints {
		return points
	}

	out := make([]seriesPoint, 0, maxPoints)
	step := float64(len(points)-1) / float64(maxPoints-1)
	for i := 0; i < maxPoints-1; i++ {
		out = append(out, points[int(math.Round(float64(i)*step))])
	}
	return append(out, points[len(points)-1])
}

type valueStats struct {
	best        float64
	worst       float64
	maxDrawdown float64
}

// summarize reports the peak, trough and worst peak-to-trough fall of a leg.
func summarize(points []seriesPoint, pick func(seriesPoint) float64) valueStats {
	if len(points) == 0 {
		return valueStats{}
	}

	first := pick(points[0])
	stats := valueStats{best: first, worst: first}
	peak := first
	for _, p := range points {
		v := pick(p)
		if v > stats.best {
			stats.best = v
		}
		if v < stats.worst {
			stats.worst = v
		}
		if v > peak {
			peak = v
		}
		if peak > 0 {
			if drawdown := (peak - v) / peak * 100; drawdown > stats.maxDrawdown {
				stats.maxDrawdown = drawdown
			}
		}
	}

	stats.best = r2(stats.best)
	stats.worst = r2(stats.worst)
	stats.maxDrawdown = r2(stats.maxDrawdown)
	return stats
}

// ── Metrics ────────────────────────────────────────────────────────────────

// computeMetrics calculates annualized volatility for each symbol and their
// correlation, both from the TRY-converted, date-aligned closes.
func computeMetrics(closesA, closesB []float64) metricsResult {
	returnsA := logReturns(closesA)
	returnsB := logReturns(closesB)

	n := min(len(returnsA), len(returnsB))
	corr := 0.0
	if n >= 2 {
		corr = pearson(returnsA[:n], returnsB[:n])
	}

	return metricsResult{
		SymbolAVolatility: r2(annualizedVol(returnsA) * 100),
		SymbolBVolatility: r2(annualizedVol(returnsB) * 100),
		Correlation:       r4(corr),
		TradingDays:       len(closesA),
	}
}

func logReturns(closes []float64) []float64 {
	if len(closes) < 2 {
		return nil
	}
	out := make([]float64, 0, len(closes)-1)
	for i := 1; i < len(closes); i++ {
		if closes[i-1] > 0 && closes[i] > 0 {
			out = append(out, math.Log(closes[i]/closes[i-1]))
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
	if _, err := rand.Read(b); err != nil {
		// crypto/rand failing means we cannot mint a guessable-proof token.
		return uuid.NewString()
	}
	return hex.EncodeToString(b)
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func r2(v float64) float64 { return math.Round(v*100) / 100 }
func r4(v float64) float64 { return math.Round(v*10000) / 10000 }
