package com.insurai.auth.repository;

import com.insurai.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenAndRevokedFalseAndExpiresAtAfter(String token, Instant now);

    void deleteByUserId(UUID userId);
}
