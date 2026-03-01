package com.keskealsaydim.repository;

import com.keskealsaydim.entity.Investment;
import com.keskealsaydim.entity.enums.InvestmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, UUID> {

    List<Investment> findByUserIdOrderByBuyDateDesc(UUID userId);

    List<Investment> findByUserIdAndStatus(UUID userId, InvestmentStatus status);

    @Query("SELECT i FROM Investment i WHERE i.user.id = :userId AND i.status = 'OPEN' ORDER BY i.buyDate DESC")
    List<Investment> findOpenInvestments(UUID userId);

    @Query("SELECT DISTINCT i.symbol FROM Investment i WHERE i.user.id = :userId AND i.status = 'OPEN'")
    List<String> findDistinctOpenSymbols(UUID userId);

    @Query("SELECT i FROM Investment i WHERE i.user.id = :userId AND i.symbol = :symbol ORDER BY i.buyDate DESC")
    List<Investment> findByUserIdAndSymbol(UUID userId, String symbol);

    @Query("SELECT i FROM Investment i WHERE i.user.id = :userId AND i.buyDate BETWEEN :startDate AND :endDate")
    List<Investment> findByUserIdAndDateRange(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(i.buyPrice * i.quantity) FROM Investment i WHERE i.user.id = :userId AND i.status = 'OPEN'")
    java.math.BigDecimal getTotalInvestedAmount(UUID userId);
}
