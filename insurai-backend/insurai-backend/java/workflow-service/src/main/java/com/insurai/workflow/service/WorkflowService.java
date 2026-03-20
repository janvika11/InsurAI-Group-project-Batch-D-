package com.insurai.workflow.service;

import com.insurai.workflow.dto.*;
import com.insurai.workflow.entity.Workflow;
import com.insurai.workflow.entity.WorkflowStep;
import com.insurai.workflow.kafka.NotificationEventProducer;
import com.insurai.workflow.kafka.PolicyEventProducer;
import com.insurai.workflow.repository.WorkflowRepository;
import com.insurai.workflow.repository.WorkflowStepRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowStepRepository workflowStepRepository;
    private final PolicyEventProducer policyEventProducer;
    private final NotificationEventProducer notificationEventProducer;

    @Transactional
    public void createWorkflowOnPolicyCreated(String policyId, String policyNumber,
                                              String holderId, String holderName, String policyType) {
        if (workflowRepository.findByPolicyId(UUID.fromString(policyId)).isPresent()) {
            log.debug("Workflow already exists for policy {}", policyId);
            return;
        }

        Workflow workflow = Workflow.builder()
                .policyId(UUID.fromString(policyId))
                .policyNumber(policyNumber)
                .holderId(holderId != null ? UUID.fromString(holderId) : null)
                .holderName(holderName)
                .policyType(policyType)
                .status(Workflow.WorkflowStatus.PENDING)
                .currentStep(Workflow.StepType.RISK_SCORING)
                .build();
        workflowRepository.save(workflow);
        log.info("Created workflow for policy {}", policyNumber);
    }

    @Transactional
    public void updateWorkflowOnRiskResult(String policyId, Integer riskScore) {
        Workflow workflow = workflowRepository.findByPolicyId(UUID.fromString(policyId))
                .orElse(null);
        if (workflow == null) {
            log.warn("Workflow not found for policy {}", policyId);
            return;
        }

        workflow.setRiskScore(riskScore);
        workflow.setStatus(Workflow.WorkflowStatus.IN_REVIEW);
        workflow.setCurrentStep(Workflow.StepType.UNDERWRITER_REVIEW);
        workflowRepository.save(workflow);

        WorkflowStep step = WorkflowStep.builder()
                .workflowId(workflow.getId())
                .stepType(Workflow.StepType.RISK_SCORING)
                .status("COMPLETED")
                .completedAt(OffsetDateTime.now())
                .build();
        workflowStepRepository.save(step);
        log.info("Updated workflow {} with risk score {}", workflow.getPolicyNumber(), riskScore);
    }

    public Page<WorkflowDto> list(Workflow.WorkflowStatus status, UUID assignedTo, Pageable pageable) {
        if (status != null && assignedTo != null) {
            return workflowRepository.findByStatusAndAssignedTo(status, assignedTo, pageable)
                    .map(WorkflowDto::from);
        }
        if (status != null) {
            return workflowRepository.findByStatus(status, pageable).map(WorkflowDto::from);
        }
        if (assignedTo != null) {
            return workflowRepository.findByAssignedTo(assignedTo, pageable).map(WorkflowDto::from);
        }
        return workflowRepository.findAll(pageable).map(WorkflowDto::from);
    }

    public WorkflowDto getByPolicyId(UUID policyId) {
        Workflow workflow = workflowRepository.findByPolicyId(policyId)
                .orElseThrow(() -> new EntityNotFoundException("Workflow not found for policy: " + policyId));
        return WorkflowDto.from(workflow);
    }

    public WorkflowDto getById(UUID id) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Workflow not found: " + id));
        return WorkflowDto.from(workflow);
    }

    public List<WorkflowDto> getMyQueue(UUID userId) {
        return workflowRepository.findByAssignedTo(userId).stream()
                .map(WorkflowDto::from)
                .toList();
    }

    @Transactional
    public WorkflowDto assign(UUID workflowId, UUID underwriterId) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new EntityNotFoundException("Workflow not found: " + workflowId));

        workflow.setAssignedTo(underwriterId);
        workflowRepository.save(workflow);

        notificationEventProducer.publishWorkflowAssigned(
                underwriterId.toString(),
                "",
                "",
                workflow.getPolicyNumber()
        );
        log.info("Assigned workflow {} to underwriter {}", workflow.getPolicyNumber(), underwriterId);
        return WorkflowDto.from(workflow);
    }

    @Transactional
    public WorkflowDto decision(UUID workflowId, String decision, String notes, UUID actorId) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new EntityNotFoundException("Workflow not found: " + workflowId));

        if (!actorId.equals(workflow.getAssignedTo())) {
            throw new IllegalArgumentException("Only the assigned underwriter can make decisions");
        }

        WorkflowStep step = WorkflowStep.builder()
                .workflowId(workflow.getId())
                .stepType(workflow.getCurrentStep())
                .status(decision)
                .actorId(actorId)
                .notes(notes)
                .completedAt(OffsetDateTime.now())
                .build();
        workflowStepRepository.save(step);

        switch (decision.toUpperCase()) {
            case "APPROVED" -> {
                workflow.setStatus(Workflow.WorkflowStatus.APPROVED);
                workflow.setCurrentStep(Workflow.StepType.FINAL_APPROVAL);
                workflowRepository.save(workflow);
                policyEventProducer.publishWorkflowApproved(
                        workflow.getPolicyId().toString(),
                        workflow.getPolicyNumber(),
                        workflow.getHolderId() != null ? workflow.getHolderId().toString() : "",
                        workflow.getHolderName(),
                        workflow.getPolicyType()
                );
                notificationEventProducer.publishPolicyApproved(
                        workflow.getHolderId() != null ? workflow.getHolderId().toString() : "",
                        "",
                        workflow.getHolderName(),
                        workflow.getPolicyNumber()
                );
            }
            case "REJECTED" -> {
                workflow.setStatus(Workflow.WorkflowStatus.REJECTED);
                workflowRepository.save(workflow);
                policyEventProducer.publishWorkflowRejected(
                        workflow.getPolicyId().toString(),
                        workflow.getPolicyNumber(),
                        workflow.getHolderId() != null ? workflow.getHolderId().toString() : "",
                        workflow.getHolderName(),
                        workflow.getPolicyType(),
                        notes
                );
                notificationEventProducer.publishPolicyRejected(
                        workflow.getHolderId() != null ? workflow.getHolderId().toString() : "",
                        "",
                        workflow.getHolderName(),
                        workflow.getPolicyNumber(),
                        notes
                );
            }
            case "ESCALATE" -> {
                workflow.setStatus(Workflow.WorkflowStatus.ESCALATED);
                workflow.setEscalationReason(notes);
                workflow.setCurrentStep(Workflow.StepType.SENIOR_REVIEW);
                workflowRepository.save(workflow);
            }
            default -> throw new IllegalArgumentException("Invalid decision: " + decision);
        }

        return WorkflowDto.from(workflow);
    }

    public List<WorkflowStepDto> getHistory(UUID workflowId) {
        return workflowStepRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId).stream()
                .map(WorkflowStepDto::from)
                .toList();
    }
}
