package com.insurai.policy.repository;

import com.insurai.policy.entity.Policy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface PolicyRepository extends JpaRepository<Policy, UUID>, JpaSpecificationExecutor<Policy> {

    Optional<Policy> findByPolicyNumber(String policyNumber);

    Page<Policy> findByHolderId(UUID holderId, Pageable pageable);
}
