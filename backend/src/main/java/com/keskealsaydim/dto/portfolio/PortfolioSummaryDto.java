package com.keskealsaydim.dto.portfolio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSummaryDto {

    // Total values
    private BigDecimal totalValue;
    private BigDecimal totalCost;
    private BigDecimal totalProfit;
    private BigDecimal totalProfitPercent;

    // Daily change
    private BigDecimal dailyChange;
    private BigDecimal dailyChangePercent;

    // Investment count
    private int totalInvestments;
    private int openInvestments;
    private int closedInvestments;

    // Best/Worst performers
    private InvestmentDto bestPerformer;
    private InvestmentDto worstPerformer;

    // Sector distribution
    private Map<String, BigDecimal> sectorDistribution;

    // Holdings
    private List<InvestmentDto> holdings;
}
