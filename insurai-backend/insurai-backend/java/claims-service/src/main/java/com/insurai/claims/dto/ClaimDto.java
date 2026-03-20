package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ClaimDto {

    private UUID id;
    private String claimNumber;
    private UUID policyId;
    private String policyNumber;
    private UUID holderId;
    private String holderName;
    private Claim.ClaimType claimType;
    private Claim.ClaimStatus status;
    private BigDecimal claimedAmount;
    private BigDecimal approvedAmount;
    private LocalDate incidentDate;
    private String description;
    private Integer fraudScore;
    private String fraudVerdict;
    private List<String> fraudFactors;
    private UUID assignedAdjusterId;
    private OffsetDateTime filedAt;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime createdAt;
    private List<ClaimStatusHistoryDto> statusHistory;
    private List<ClaimDocumentDto> documents;
}
