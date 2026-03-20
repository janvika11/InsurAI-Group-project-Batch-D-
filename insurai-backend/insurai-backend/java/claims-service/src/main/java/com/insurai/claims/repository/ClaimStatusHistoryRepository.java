package com.insurai.claims.repository;

import com.insurai.claims.entity.ClaimStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClaimStatusHistoryRepository extends JpaRepository<ClaimStatusHistory, UUID> {

    List<ClaimStatusHistory> findByClaim_IdOrderByCreatedAtDesc(UUID claimId);
}
