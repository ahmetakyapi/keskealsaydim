package com.keskealsaydim.repository;

import com.keskealsaydim.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    Optional<UserSession> findByRefreshToken(String refreshToken);

    @Query("SELECT s FROM UserSession s WHERE s.refreshToken = :token AND s.revokedAt IS NULL AND s.expiresAt > :now")
    Optional<UserSession> findValidSession(String token, LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.revokedAt = :now WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    void revokeAllUserSessions(UUID userId, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :now OR s.revokedAt IS NOT NULL")
    void deleteExpiredSessions(LocalDateTime now);
}
