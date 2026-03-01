package com.keskealsaydim.repository;

import com.keskealsaydim.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {

    List<Watchlist> findByUserIdOrderByDisplayOrder(UUID userId);

    Optional<Watchlist> findByUserIdAndSymbol(UUID userId, String symbol);

    boolean existsByUserIdAndSymbol(UUID userId, String symbol);

    void deleteByUserIdAndSymbol(UUID userId, String symbol);

    long countByUserId(UUID userId);
}
