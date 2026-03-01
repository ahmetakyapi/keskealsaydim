package com.keskealsaydim.dto.watchlist;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddToWatchlistRequest {

    @NotBlank(message = "Hisse sembolü gereklidir")
    private String symbol;

    private String symbolName;
    private String exchange = "BIST";
    private String notes;
}
