package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ClaimSummaryDto {

    private UUID id;
    private String claimNumber;
    private UUID policyId;
    private String policyNumber;
    private Claim.ClaimType claimType;
    private Claim.ClaimStatus status;
    private BigDecimal claimedAmount;
    private BigDecimal approvedAmount;
    private LocalDate incidentDate;
    private Integer fraudScore;
    private OffsetDateTime filedAt;
}
