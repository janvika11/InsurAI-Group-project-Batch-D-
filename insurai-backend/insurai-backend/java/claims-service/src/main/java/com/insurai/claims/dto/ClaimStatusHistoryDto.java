package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ClaimStatusHistoryDto {

    private UUID id;
    private Claim.ClaimStatus fromStatus;
    private Claim.ClaimStatus toStatus;
    private UUID changedBy;
    private String note;
    private OffsetDateTime createdAt;
}
