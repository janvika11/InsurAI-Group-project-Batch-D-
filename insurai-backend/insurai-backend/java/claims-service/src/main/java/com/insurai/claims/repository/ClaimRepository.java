package com.insurai.claims.repository;

import com.insurai.claims.entity.Claim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClaimRepository extends JpaRepository<Claim, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Claim> {

    Optional<Claim> findByClaimNumber(String claimNumber);

    Page<Claim> findByHolderId(UUID holderId, Pageable pageable);

    Page<Claim> findByPolicyId(UUID policyId, Pageable pageable);

    Page<Claim> findByStatus(Claim.ClaimStatus status, Pageable pageable);

    Page<Claim> findByHolderIdAndStatus(UUID holderId, Claim.ClaimStatus status, Pageable pageable);

    Page<Claim> findByPolicyIdAndStatus(UUID policyId, Claim.ClaimStatus status, Pageable pageable);

    long countByHolderId(UUID holderId);
}
