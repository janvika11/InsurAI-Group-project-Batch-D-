package com.insurai.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workflow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "policy_id", unique = true, nullable = false)
    private UUID policyId;

    @Column(name = "policy_number", nullable = false, length = 50)
    private String policyNumber;

    @Column(name = "holder_id")
    private UUID holderId;

    @Column(name = "holder_name")
    private String holderName;

    @Column(name = "policy_type", length = 50)
    private String policyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private WorkflowStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_step")
    private StepType currentStep;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(name = "escalation_reason", columnDefinition = "TEXT")
    private String escalationReason;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public enum WorkflowStatus {
        PENDING, IN_REVIEW, APPROVED, REJECTED, ESCALATED
    }

    public enum StepType {
        RISK_SCORING, UNDERWRITER_REVIEW, SENIOR_REVIEW, FINAL_APPROVAL
    }
}
