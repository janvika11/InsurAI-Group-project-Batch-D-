package com.insurai.policy.dto;

import com.insurai.policy.entity.Policy;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class PolicySummaryDto {

    private UUID id;
    private String policyNumber;
    private String holderName;
    private Policy.PolicyType policyType;
    private Policy.PolicyStatus status;
    private BigDecimal premiumAmount;
    private BigDecimal coverageAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer riskScore;
}
