package com.keskealsaydim.repository;

import com.keskealsaydim.entity.PriceAlert;
import com.keskealsaydim.entity.enums.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

    List<PriceAlert> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<PriceAlert> findByUserIdAndStatus(UUID userId, AlertStatus status);

    @Query("SELECT p FROM PriceAlert p WHERE p.status = 'ACTIVE' AND p.symbol = :symbol")
    List<PriceAlert> findActiveAlertsBySymbol(String symbol);

    @Query("SELECT DISTINCT p.symbol FROM PriceAlert p WHERE p.status = 'ACTIVE'")
    List<String> findDistinctActiveSymbols();

    long countByUserIdAndStatus(UUID userId, AlertStatus status);
}
