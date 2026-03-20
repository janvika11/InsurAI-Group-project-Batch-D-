package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CreateClaimResponse {

    private UUID id;
    private String claimNumber;
    private Claim.ClaimStatus status;
    private Integer fraudScore;
    private String message;
}
