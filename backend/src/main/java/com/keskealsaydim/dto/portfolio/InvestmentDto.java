package com.keskealsaydim.dto.portfolio;

import com.keskealsaydim.entity.Investment;
import com.keskealsaydim.entity.enums.InvestmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentDto {

    private UUID id;
    private String symbol;
    private String symbolName;
    private String exchange;
    private BigDecimal quantity;
    private BigDecimal buyPrice;
    private LocalDate buyDate;
    private BigDecimal buyCommission;
    private BigDecimal sellPrice;
    private LocalDate sellDate;
    private BigDecimal sellCommission;
    private InvestmentStatus status;
    private String currency;
    private String notes;
    private String[] tags;

    // Calculated fields (populated with current prices)
    private BigDecimal currentPrice;
    private BigDecimal currentValue;
    private BigDecimal totalCost;
    private BigDecimal profit;
    private BigDecimal profitPercent;
    private BigDecimal weight; // Portfolio weight percentage

    public static InvestmentDto fromEntity(Investment investment) {
        return InvestmentDto.builder()
                .id(investment.getId())
                .symbol(investment.getSymbol())
                .symbolName(investment.getSymbolName())
                .exchange(investment.getExchange())
                .quantity(investment.getQuantity())
                .buyPrice(investment.getBuyPrice())
                .buyDate(investment.getBuyDate())
                .buyCommission(investment.getBuyCommission())
                .sellPrice(investment.getSellPrice())
                .sellDate(investment.getSellDate())
                .sellCommission(investment.getSellCommission())
                .status(investment.getStatus())
                .currency(investment.getCurrency())
                .notes(investment.getNotes())
                .tags(investment.getTags())
                .totalCost(investment.getTotalCost())
                .build();
    }
}
