package com.insurai.renewal.repository;

import com.insurai.renewal.entity.Renewal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RenewalRepository extends JpaRepository<Renewal, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Renewal> {

    Optional<Renewal> findByPolicyId(UUID policyId);

    Page<Renewal> findByHolderId(UUID holderId, Pageable pageable);

    Page<Renewal> findByRenewalStatus(String status, Pageable pageable);

    Page<Renewal> findByHolderIdAndRenewalStatus(UUID holderId, String status, Pageable pageable);

    List<Renewal> findByExpiryDateBetweenAndRenewalStatus(LocalDate from, LocalDate to, String status);

    List<Renewal> findByExpiryDateBeforeAndRenewalStatus(LocalDate date, String status);
}
