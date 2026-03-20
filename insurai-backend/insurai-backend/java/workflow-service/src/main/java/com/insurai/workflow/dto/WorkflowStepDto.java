package com.insurai.workflow.dto;

import com.insurai.workflow.entity.Workflow;
import com.insurai.workflow.entity.WorkflowStep;
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
public class WorkflowStepDto {

    private UUID id;
    private UUID workflowId;
    private Workflow.StepType stepType;
    private String status;
    private UUID actorId;
    private String notes;
    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;

    public static WorkflowStepDto from(WorkflowStep step) {
        return WorkflowStepDto.builder()
                .id(step.getId())
                .workflowId(step.getWorkflowId())
                .stepType(step.getStepType())
                .status(step.getStatus())
                .actorId(step.getActorId())
                .notes(step.getNotes())
                .completedAt(step.getCompletedAt())
                .createdAt(step.getCreatedAt())
                .build();
    }
}
