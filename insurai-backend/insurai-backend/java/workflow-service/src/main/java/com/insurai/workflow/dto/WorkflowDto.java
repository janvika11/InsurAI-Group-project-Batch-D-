package com.insurai.workflow.dto;

import com.insurai.workflow.entity.Workflow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDto {

    private UUID id;
    private UUID policyId;
    private String policyNumber;
    private UUID holderId;
    private String holderName;
    private String policyType;
    private Workflow.WorkflowStatus status;
    private Workflow.StepType currentStep;
    private UUID assignedTo;
    private Integer riskScore;
    private String escalationReason;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static WorkflowDto from(Workflow w) {
        return WorkflowDto.builder()
                .id(w.getId())
                .policyId(w.getPolicyId())
                .policyNumber(w.getPolicyNumber())
                .holderId(w.getHolderId())
                .holderName(w.getHolderName())
                .policyType(w.getPolicyType())
                .status(w.getStatus())
                .currentStep(w.getCurrentStep())
                .assignedTo(w.getAssignedTo())
                .riskScore(w.getRiskScore())
                .escalationReason(w.getEscalationReason())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}
