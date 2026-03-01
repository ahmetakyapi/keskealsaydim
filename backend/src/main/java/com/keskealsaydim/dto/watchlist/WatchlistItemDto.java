package com.keskealsaydim.dto.watchlist;

import com.keskealsaydim.entity.Watchlist;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WatchlistItemDto {

    private UUID id;
    private String symbol;
    private String symbolName;
    private String exchange;
    private String notes;
    private Integer displayOrder;
    private LocalDateTime addedAt;

    // Live data (populated from stock service)
    private BigDecimal price;
    private BigDecimal change;
    private BigDecimal changePercent;
    private BigDecimal week52High;
    private BigDecimal week52Low;
    private BigDecimal marketCap;

    public static WatchlistItemDto fromEntity(Watchlist watchlist) {
        return WatchlistItemDto.builder()
                .id(watchlist.getId())
                .symbol(watchlist.getSymbol())
                .symbolName(watchlist.getSymbolName())
                .exchange(watchlist.getExchange())
                .notes(watchlist.getNotes())
                .displayOrder(watchlist.getDisplayOrder())
                .addedAt(watchlist.getAddedAt())
                .build();
    }
}
