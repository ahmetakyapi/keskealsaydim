package com.keskealsaydim.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "comparison_scenarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonScenario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // What user actually bought
    @Column(name = "symbol_a", nullable = false, length = 20)
    private String symbolA;

    @Column(name = "symbol_a_name", length = 100)
    private String symbolAName;

    // What user could have bought
    @Column(name = "symbol_b", nullable = false, length = 20)
    private String symbolB;

    @Column(name = "symbol_b_name", length = 100)
    private String symbolBName;

    // Scenario parameters
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate; // NULL means until today

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "amount_type", length = 10)
    @Builder.Default
    private String amountType = "MONEY"; // MONEY or QUANTITY

    // Results (cached as JSONB)
    @Type(JsonType.class)
    @Column(name = "result_json", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> resultJson;

    // Metadata
    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_favorite")
    @Builder.Default
    private Boolean isFavorite = false;

    @Column(name = "share_token", length = 50, unique = true)
    private String shareToken;

    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
