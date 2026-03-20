package com.insurai.policy.dto;

import com.insurai.policy.entity.Policy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class CreatePolicyRequest {

    @NotBlank(message = "holderName is required")
    private String holderName;

    @NotNull(message = "policyType is required")
    private Policy.PolicyType policyType;

    private BigDecimal coverageAmount;

    private LocalDate startDate;

    private LocalDate endDate;

    private Map<String, Object> metadata;
}
