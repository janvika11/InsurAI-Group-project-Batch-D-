package com.insurai.renewal.repository;

import com.insurai.renewal.entity.RenewalQuote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RenewalQuoteRepository extends JpaRepository<RenewalQuote, UUID> {

    List<RenewalQuote> findByRenewal_Id(UUID renewalId);
}
