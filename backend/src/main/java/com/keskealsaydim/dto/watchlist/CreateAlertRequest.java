package com.keskealsaydim.dto.watchlist;

import com.keskealsaydim.entity.enums.AlertDirection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CreateAlertRequest {

    @NotBlank(message = "Hisse sembolü gereklidir")
    private String symbol;

    @NotNull(message = "Hedef fiyat gereklidir")
    @Positive(message = "Hedef fiyat pozitif olmalıdır")
    private BigDecimal targetPrice;

    @NotNull(message = "Yön gereklidir")
    private AlertDirection direction;

    private String message;
    private Boolean notifyEmail = true;
    private Boolean notifyPush = true;
    private LocalDateTime expiresAt;
}
