package com.keskealsaydim.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockSearchResult {

    private String symbol;
    private String name;
    private String exchange;
    private String type; // Stock, ETF, etc.
    private String sector;
}
