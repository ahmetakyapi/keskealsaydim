package com.keskealsaydim.dto.portfolio;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateInvestmentRequest {

    @NotBlank(message = "Hisse sembolü gereklidir")
    private String symbol;

    private String symbolName;

    private String exchange = "BIST";

    @NotNull(message = "Miktar gereklidir")
    @Positive(message = "Miktar pozitif olmalıdır")
    private BigDecimal quantity;

    @NotNull(message = "Alış fiyatı gereklidir")
    @Positive(message = "Alış fiyatı pozitif olmalıdır")
    private BigDecimal buyPrice;

    @NotNull(message = "Alış tarihi gereklidir")
    private LocalDate buyDate;

    private BigDecimal buyCommission;

    private String currency = "TRY";

    private String notes;

    private String[] tags;
}
