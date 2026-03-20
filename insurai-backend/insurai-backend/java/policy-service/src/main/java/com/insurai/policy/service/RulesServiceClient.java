package com.insurai.policy.service;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "rules-service", url = "${rules-service.url}", fallback = RulesServiceClientFallback.class)
public interface RulesServiceClient {

    @GetMapping("/api/rules/check-eligibility")
    boolean checkEligibility(@RequestParam("policyType") String policyType);
}
