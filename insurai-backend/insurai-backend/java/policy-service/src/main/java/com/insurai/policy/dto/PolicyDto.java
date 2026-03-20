package com.insurai.policy.dto;

import com.insurai.policy.entity.Policy;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class PolicyDto {

    private UUID id;
    private String policyNumber;
    private UUID holderId;
    private String holderName;
    private UUID orgId;
    private Policy.PolicyType policyType;
    private Policy.PolicyStatus status;
    private BigDecimal premiumAmount;
    private BigDecimal coverageAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer riskScore;
    private String aiRecommendation;
    private UUID templateId;
    private Map<String, Object> metadata;
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
