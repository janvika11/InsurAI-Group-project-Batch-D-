package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class FileClaimRequest {

    @NotNull(message = "Policy ID is required")
    private java.util.UUID policyId;

    @NotNull(message = "Claim type is required")
    private Claim.ClaimType claimType;

    @NotNull(message = "Incident date is required")
    private LocalDate incidentDate;

    @NotNull(message = "Claimed amount is required")
    @DecimalMin(value = "0.01", message = "Claimed amount must be positive")
    private BigDecimal claimedAmount;

    private String description;
}
