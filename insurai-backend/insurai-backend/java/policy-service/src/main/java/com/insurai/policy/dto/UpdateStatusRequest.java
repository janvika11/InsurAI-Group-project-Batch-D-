package com.insurai.policy.dto;

import com.insurai.policy.entity.Policy;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    @NotNull(message = "status is required")
    private Policy.PolicyStatus status;

    private String reason;
}
