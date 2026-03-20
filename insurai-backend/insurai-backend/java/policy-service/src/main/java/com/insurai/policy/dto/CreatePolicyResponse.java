package com.insurai.policy.dto;

import com.insurai.policy.entity.Policy;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CreatePolicyResponse {

    private UUID id;
    private String policyNumber;
    private Policy.PolicyStatus status;
    private Integer riskScore;
    private String message;
}
