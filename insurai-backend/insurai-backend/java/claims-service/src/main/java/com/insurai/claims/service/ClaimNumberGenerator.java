package com.insurai.claims.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

@Component
public class ClaimNumberGenerator {

    @PersistenceContext
    private EntityManager entityManager;

    public String generate() {
        Number seq = (Number) entityManager.createNativeQuery("SELECT nextval('claim_number_seq')")
                .getSingleResult();
        return String.format("CLM-%04d", seq.intValue());
    }
}
