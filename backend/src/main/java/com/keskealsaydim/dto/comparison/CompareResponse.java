package com.keskealsaydim.dto.comparison;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompareResponse {

    private UUID scenarioId;

    // Input parameters
    private String symbolA;
    private String symbolAName;
    private String symbolB;
    private String symbolBName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal investmentAmount;

    // Symbol A results
    private SymbolResult resultA;

    // Symbol B results
    private SymbolResult resultB;

    // Comparison summary
    private ComparisonSummary summary;

    // Chart data
    private List<ChartDataPoint> chartData;

    // Metrics comparison
    private MetricsComparison metrics;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SymbolResult {
        private String symbol;
        private String name;
        private BigDecimal startPrice;
        private BigDecimal endPrice;
        private BigDecimal changePercent;
        private BigDecimal quantity;
        private BigDecimal startValue;
        private BigDecimal endValue;
        private BigDecimal profit;
        private BigDecimal profitPercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComparisonSummary {
        private BigDecimal differenceAmount;    // Absolute TL difference
        private BigDecimal differencePercent;   // Percentage points difference
        private String winnerSymbol;            // "A" or "B"
        private boolean missedOpportunity;      // True if symbol B was better
        private String message;                 // Human readable summary in Turkish
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private LocalDate date;
        private BigDecimal priceA;
        private BigDecimal priceB;
        private BigDecimal normalizedA;  // Percentage from start
        private BigDecimal normalizedB;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsComparison {
        private BigDecimal volatilityA;
        private BigDecimal volatilityB;
        private BigDecimal maxDrawdownA;
        private BigDecimal maxDrawdownB;
        private BigDecimal avgVolumeA;
        private BigDecimal avgVolumeB;
        private BigDecimal correlation;
    }
}
