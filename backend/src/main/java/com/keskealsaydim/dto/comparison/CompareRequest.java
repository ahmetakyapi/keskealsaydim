package com.keskealsaydim.dto.comparison;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CompareRequest {

    @NotBlank(message = "Aldığınız hisse sembolü gereklidir")
    private String symbolA;

    @NotBlank(message = "Karşılaştırmak istediğiniz hisse sembolü gereklidir")
    private String symbolB;

    @NotNull(message = "Başlangıç tarihi gereklidir")
    private LocalDate startDate;

    private LocalDate endDate; // null means today

    @NotNull(message = "Yatırım tutarı gereklidir")
    @Positive(message = "Yatırım tutarı pozitif olmalıdır")
    private BigDecimal amount;

    private String amountType = "MONEY"; // MONEY or QUANTITY
}
