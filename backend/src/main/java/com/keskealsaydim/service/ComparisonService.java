package com.keskealsaydim.service;

import com.keskealsaydim.dto.comparison.CompareRequest;
import com.keskealsaydim.dto.comparison.CompareResponse;
import com.keskealsaydim.dto.comparison.CompareResponse.*;
import com.keskealsaydim.dto.stock.StockHistoryDto;
import com.keskealsaydim.dto.stock.StockHistoryDto.HistoryPoint;
import com.keskealsaydim.entity.ComparisonScenario;
import com.keskealsaydim.entity.User;
import com.keskealsaydim.exception.BadRequestException;
import com.keskealsaydim.exception.ResourceNotFoundException;
import com.keskealsaydim.repository.ComparisonScenarioRepository;
import com.keskealsaydim.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComparisonService {

    private final DataServiceClient dataServiceClient;
    private final ComparisonScenarioRepository scenarioRepository;
    private final UserRepository userRepository;

    @Transactional
    public CompareResponse compare(CompareRequest request, UUID userId) {
        LocalDate endDate = request.getEndDate() != null ? request.getEndDate() : LocalDate.now();

        if (request.getStartDate().isAfter(endDate)) {
            throw new BadRequestException("Başlangıç tarihi bitiş tarihinden sonra olamaz");
        }

        if (request.getStartDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Başlangıç tarihi gelecekte olamaz");
        }

        // Get historical data for both symbols
        StockHistoryDto historyA = dataServiceClient.getHistory(
                request.getSymbolA(), request.getStartDate(), endDate, "1d");
        StockHistoryDto historyB = dataServiceClient.getHistory(
                request.getSymbolB(), request.getStartDate(), endDate, "1d");

        if (historyA == null || historyA.getData() == null || historyA.getData().isEmpty()) {
            throw new BadRequestException(request.getSymbolA() + " için geçmiş verisi bulunamadı");
        }
        if (historyB == null || historyB.getData() == null || historyB.getData().isEmpty()) {
            throw new BadRequestException(request.getSymbolB() + " için geçmiş verisi bulunamadı");
        }

        // Calculate results
        SymbolResult resultA = calculateSymbolResult(
                request.getSymbolA(), historyA, request.getAmount());
        SymbolResult resultB = calculateSymbolResult(
                request.getSymbolB(), historyB, request.getAmount());

        // Create comparison summary
        ComparisonSummary summary = createComparisonSummary(resultA, resultB);

        // Create chart data
        List<ChartDataPoint> chartData = createChartData(historyA, historyB);

        // Calculate metrics
        MetricsComparison metrics = calculateMetrics(historyA, historyB);

        // Save scenario if user is logged in
        UUID scenarioId = null;
        if (userId != null) {
            scenarioId = saveScenario(request, userId, resultA, resultB, summary, endDate);
        }

        return CompareResponse.builder()
                .scenarioId(scenarioId)
                .symbolA(request.getSymbolA())
                .symbolAName(resultA.getName())
                .symbolB(request.getSymbolB())
                .symbolBName(resultB.getName())
                .startDate(request.getStartDate())
                .endDate(endDate)
                .investmentAmount(request.getAmount())
                .resultA(resultA)
                .resultB(resultB)
                .summary(summary)
                .chartData(chartData)
                .metrics(metrics)
                .build();
    }

    private SymbolResult calculateSymbolResult(String symbol, StockHistoryDto history,
                                                BigDecimal investmentAmount) {
        List<HistoryPoint> data = history.getData();
        HistoryPoint first = data.get(0);
        HistoryPoint last = data.get(data.size() - 1);

        BigDecimal startPrice = first.getClose();
        BigDecimal endPrice = last.getClose();

        BigDecimal quantity = investmentAmount.divide(startPrice, 8, RoundingMode.HALF_UP);
        BigDecimal startValue = investmentAmount;
        BigDecimal endValue = quantity.multiply(endPrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal profit = endValue.subtract(startValue);
        BigDecimal profitPercent = profit.divide(startValue, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
        BigDecimal changePercent = endPrice.subtract(startPrice)
                .divide(startPrice, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));

        return SymbolResult.builder()
                .symbol(symbol)
                .name(symbol) // Will be replaced with actual name from data service
                .startPrice(startPrice)
                .endPrice(endPrice)
                .changePercent(changePercent)
                .quantity(quantity)
                .startValue(startValue)
                .endValue(endValue)
                .profit(profit)
                .profitPercent(profitPercent)
                .build();
    }

    private ComparisonSummary createComparisonSummary(SymbolResult resultA, SymbolResult resultB) {
        BigDecimal difference = resultB.getProfit().subtract(resultA.getProfit());
        BigDecimal differencePercent = resultB.getProfitPercent().subtract(resultA.getProfitPercent());
        String winner = difference.compareTo(BigDecimal.ZERO) > 0 ? "B" : "A";
        boolean missedOpportunity = difference.compareTo(BigDecimal.ZERO) > 0;

        String message;
        if (missedOpportunity) {
            message = String.format("Eğer %s yerine %s alsaydın, ₺%,.2f daha fazla kazanırdın!",
                    resultA.getSymbol(), resultB.getSymbol(), difference.abs());
        } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
            message = String.format("Doğru seçim yaptın! %s alarak ₺%,.2f kurtardın.",
                    resultA.getSymbol(), difference.abs());
        } else {
            message = "Her iki yatırım da aynı sonucu verirdi.";
        }

        return ComparisonSummary.builder()
                .differenceAmount(difference.abs())
                .differencePercent(differencePercent.abs())
                .winnerSymbol(winner)
                .missedOpportunity(missedOpportunity)
                .message(message)
                .build();
    }

    private List<ChartDataPoint> createChartData(StockHistoryDto historyA, StockHistoryDto historyB) {
        List<ChartDataPoint> chartData = new ArrayList<>();
        Map<LocalDate, HistoryPoint> mapB = new HashMap<>();

        for (HistoryPoint point : historyB.getData()) {
            mapB.put(point.getDate(), point);
        }

        BigDecimal baseA = historyA.getData().get(0).getClose();
        BigDecimal baseB = historyB.getData().get(0).getClose();

        for (HistoryPoint pointA : historyA.getData()) {
            HistoryPoint pointB = mapB.get(pointA.getDate());
            if (pointB != null) {
                BigDecimal normalizedA = pointA.getClose()
                        .divide(baseA, 4, RoundingMode.HALF_UP)
                        .subtract(BigDecimal.ONE)
                        .multiply(new BigDecimal("100"));
                BigDecimal normalizedB = pointB.getClose()
                        .divide(baseB, 4, RoundingMode.HALF_UP)
                        .subtract(BigDecimal.ONE)
                        .multiply(new BigDecimal("100"));

                chartData.add(ChartDataPoint.builder()
                        .date(pointA.getDate())
                        .priceA(pointA.getClose())
                        .priceB(pointB.getClose())
                        .normalizedA(normalizedA)
                        .normalizedB(normalizedB)
                        .build());
            }
        }

        return chartData;
    }

    private MetricsComparison calculateMetrics(StockHistoryDto historyA, StockHistoryDto historyB) {
        // Calculate volatility (standard deviation of daily returns)
        BigDecimal volatilityA = calculateVolatility(historyA.getData());
        BigDecimal volatilityB = calculateVolatility(historyB.getData());

        // Calculate max drawdown
        BigDecimal maxDrawdownA = calculateMaxDrawdown(historyA.getData());
        BigDecimal maxDrawdownB = calculateMaxDrawdown(historyB.getData());

        // Calculate average volume
        BigDecimal avgVolumeA = calculateAverageVolume(historyA.getData());
        BigDecimal avgVolumeB = calculateAverageVolume(historyB.getData());

        return MetricsComparison.builder()
                .volatilityA(volatilityA)
                .volatilityB(volatilityB)
                .maxDrawdownA(maxDrawdownA)
                .maxDrawdownB(maxDrawdownB)
                .avgVolumeA(avgVolumeA)
                .avgVolumeB(avgVolumeB)
                .correlation(BigDecimal.ZERO) // Simplified for now
                .build();
    }

    private BigDecimal calculateVolatility(List<HistoryPoint> data) {
        if (data.size() < 2) return BigDecimal.ZERO;

        List<BigDecimal> returns = new ArrayList<>();
        for (int i = 1; i < data.size(); i++) {
            BigDecimal prev = data.get(i - 1).getClose();
            BigDecimal curr = data.get(i).getClose();
            BigDecimal dailyReturn = curr.subtract(prev).divide(prev, 6, RoundingMode.HALF_UP);
            returns.add(dailyReturn);
        }

        BigDecimal mean = returns.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(new BigDecimal(returns.size()), 6, RoundingMode.HALF_UP);

        BigDecimal sumSquaredDiff = returns.stream()
                .map(r -> r.subtract(mean).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal variance = sumSquaredDiff.divide(new BigDecimal(returns.size()), 6, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(Math.sqrt(variance.doubleValue()))
                .multiply(new BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateMaxDrawdown(List<HistoryPoint> data) {
        if (data.isEmpty()) return BigDecimal.ZERO;

        BigDecimal maxDrawdown = BigDecimal.ZERO;
        BigDecimal peak = data.get(0).getClose();

        for (HistoryPoint point : data) {
            if (point.getClose().compareTo(peak) > 0) {
                peak = point.getClose();
            }
            BigDecimal drawdown = peak.subtract(point.getClose())
                    .divide(peak, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            if (drawdown.compareTo(maxDrawdown) > 0) {
                maxDrawdown = drawdown;
            }
        }

        return maxDrawdown.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAverageVolume(List<HistoryPoint> data) {
        if (data.isEmpty()) return BigDecimal.ZERO;

        long totalVolume = data.stream()
                .mapToLong(p -> p.getVolume() != null ? p.getVolume() : 0)
                .sum();

        return new BigDecimal(totalVolume / data.size());
    }

    private UUID saveScenario(CompareRequest request, UUID userId,
                              SymbolResult resultA, SymbolResult resultB,
                              ComparisonSummary summary, LocalDate endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Map<String, Object> resultJson = new HashMap<>();
        resultJson.put("symbolA", Map.of(
                "startPrice", resultA.getStartPrice(),
                "endPrice", resultA.getEndPrice(),
                "changePercent", resultA.getChangePercent(),
                "quantity", resultA.getQuantity(),
                "profit", resultA.getProfit(),
                "profitPercent", resultA.getProfitPercent()
        ));
        resultJson.put("symbolB", Map.of(
                "startPrice", resultB.getStartPrice(),
                "endPrice", resultB.getEndPrice(),
                "changePercent", resultB.getChangePercent(),
                "quantity", resultB.getQuantity(),
                "profit", resultB.getProfit(),
                "profitPercent", resultB.getProfitPercent()
        ));
        resultJson.put("difference", Map.of(
                "amount", summary.getDifferenceAmount(),
                "percent", summary.getDifferencePercent(),
                "winner", summary.getWinnerSymbol(),
                "missedOpportunity", summary.isMissedOpportunity()
        ));

        ComparisonScenario scenario = ComparisonScenario.builder()
                .user(user)
                .symbolA(request.getSymbolA())
                .symbolAName(resultA.getName())
                .symbolB(request.getSymbolB())
                .symbolBName(resultB.getName())
                .startDate(request.getStartDate())
                .endDate(endDate)
                .amount(request.getAmount())
                .amountType(request.getAmountType())
                .resultJson(resultJson)
                .shareToken(UUID.randomUUID().toString().substring(0, 8))
                .build();

        scenario = scenarioRepository.save(scenario);
        log.info("Comparison scenario saved: {} vs {} for user {}",
                request.getSymbolA(), request.getSymbolB(), userId);

        return scenario.getId();
    }

    @Transactional(readOnly = true)
    public Page<ComparisonScenario> getUserScenarios(UUID userId, Pageable pageable) {
        return scenarioRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public ComparisonScenario getScenarioByShareToken(String shareToken) {
        ComparisonScenario scenario = scenarioRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new ResourceNotFoundException("Senaryo bulunamadı"));
        scenarioRepository.incrementViewCount(scenario.getId());
        return scenario;
    }
}
