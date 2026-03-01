package com.keskealsaydim.repository;

import com.keskealsaydim.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.settings WHERE u.email = :email")
    Optional<User> findByEmailWithSettings(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.settings WHERE u.id = :id")
    Optional<User> findByIdWithSettings(UUID id);
}
