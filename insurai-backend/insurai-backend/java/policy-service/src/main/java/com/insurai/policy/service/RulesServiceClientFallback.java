package com.insurai.policy.service;

import org.springframework.stereotype.Component;

@Component
public class RulesServiceClientFallback implements RulesServiceClient {

    @Override
    public boolean checkEligibility(String policyType) {
        return true; // Stub: always eligible when rules-service unavailable
    }
}
