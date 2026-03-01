package com.keskealsaydim.repository;

import com.keskealsaydim.entity.ComparisonScenario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComparisonScenarioRepository extends JpaRepository<ComparisonScenario, UUID> {

    Page<ComparisonScenario> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<ComparisonScenario> findByUserIdAndIsFavoriteTrue(UUID userId);

    Optional<ComparisonScenario> findByShareToken(String shareToken);

    @Query("SELECT c FROM ComparisonScenario c WHERE c.user.id = :userId " +
           "AND c.symbolA = :symbolA AND c.symbolB = :symbolB " +
           "ORDER BY c.createdAt DESC")
    List<ComparisonScenario> findSimilarScenarios(UUID userId, String symbolA, String symbolB);

    @Modifying
    @Query("UPDATE ComparisonScenario c SET c.viewCount = c.viewCount + 1 WHERE c.id = :id")
    void incrementViewCount(UUID id);

    long countByUserId(UUID userId);
}
