package com.keskealsaydim.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockPriceDto {

    private String symbol;
    private String name;
    private String exchange;
    private BigDecimal price;
    private BigDecimal previousClose;
    private BigDecimal change;
    private BigDecimal changePercent;
    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private Long volume;
    private BigDecimal marketCap;
    private BigDecimal week52High;
    private BigDecimal week52Low;
    private LocalDateTime lastUpdated;
}
