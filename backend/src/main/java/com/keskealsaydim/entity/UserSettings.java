package com.keskealsaydim.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Notification preferences
    @Column(name = "notify_price_alerts")
    @Builder.Default
    private Boolean notifyPriceAlerts = true;

    @Column(name = "notify_daily_summary")
    @Builder.Default
    private Boolean notifyDailySummary = true;

    @Column(name = "notify_weekly_report")
    @Builder.Default
    private Boolean notifyWeeklyReport = false;

    @Column(name = "notify_news")
    @Builder.Default
    private Boolean notifyNews = true;

    @Column(name = "email_notifications")
    @Builder.Default
    private Boolean emailNotifications = true;

    @Column(name = "push_notifications")
    @Builder.Default
    private Boolean pushNotifications = true;

    // Display preferences
    @Column(name = "default_chart_period", length = 10)
    @Builder.Default
    private String defaultChartPeriod = "1M";

    @Column(name = "default_chart_type", length = 20)
    @Builder.Default
    private String defaultChartType = "line";

    @Column(name = "show_portfolio_value")
    @Builder.Default
    private Boolean showPortfolioValue = true;

    @Column(name = "compact_mode")
    @Builder.Default
    private Boolean compactMode = false;

    // Regional preferences
    @Column(length = 5)
    @Builder.Default
    private String language = "tr";

    @Column(length = 50)
    @Builder.Default
    private String timezone = "Europe/Istanbul";

    @Column(name = "date_format", length = 20)
    @Builder.Default
    private String dateFormat = "DD.MM.YYYY";

    @Column(name = "number_format", length = 20)
    @Builder.Default
    private String numberFormat = "tr-TR";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
