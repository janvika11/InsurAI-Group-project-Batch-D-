package com.insurai.claims.dto;

import com.insurai.claims.entity.Claim;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateClaimStatusRequest {

    @NotNull(message = "Status is required")
    private Claim.ClaimStatus status;

    @DecimalMin(value = "0", message = "Approved amount must be non-negative")
    private BigDecimal approvedAmount;

    private String note;
}
