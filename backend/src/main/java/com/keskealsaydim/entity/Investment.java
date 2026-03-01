package com.keskealsaydim.entity;

import com.keskealsaydim.entity.enums.InvestmentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "investments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Investment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "symbol_name", length = 100)
    private String symbolName;

    @Column(length = 20)
    @Builder.Default
    private String exchange = "BIST";

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity;

    @Column(name = "buy_price", nullable = false, precision = 18, scale = 4)
    private BigDecimal buyPrice;

    @Column(name = "buy_date", nullable = false)
    private LocalDate buyDate;

    @Column(name = "buy_commission", precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal buyCommission = BigDecimal.ZERO;

    @Column(name = "sell_price", precision = 18, scale = 4)
    private BigDecimal sellPrice;

    @Column(name = "sell_date")
    private LocalDate sellDate;

    @Column(name = "sell_commission", precision = 18, scale = 4)
    private BigDecimal sellCommission;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InvestmentStatus status = InvestmentStatus.OPEN;

    @Column(length = 3)
    @Builder.Default
    private String currency = "TRY";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "VARCHAR(255)[]")
    private String[] tags;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "investment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InvestmentTransaction> transactions = new ArrayList<>();

    // Helper methods
    public BigDecimal getTotalCost() {
        return buyPrice.multiply(quantity).add(buyCommission != null ? buyCommission : BigDecimal.ZERO);
    }

    public BigDecimal getTotalValue(BigDecimal currentPrice) {
        return currentPrice.multiply(quantity);
    }

    public BigDecimal getProfit(BigDecimal currentPrice) {
        return getTotalValue(currentPrice).subtract(getTotalCost());
    }

    public BigDecimal getProfitPercent(BigDecimal currentPrice) {
        BigDecimal cost = getTotalCost();
        if (cost.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return getProfit(currentPrice).divide(cost, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
    }
}
