package com.insurai.claims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "claim_number", unique = true, nullable = false, length = 50)
    private String claimNumber;

    @Column(name = "policy_id", nullable = false)
    private UUID policyId;

    @Column(name = "policy_number", nullable = false, length = 50)
    private String policyNumber;

    @Column(name = "holder_id", nullable = false)
    private UUID holderId;

    @Column(name = "holder_name", nullable = false)
    private String holderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_type", nullable = false)
    private ClaimType claimType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ClaimStatus status;

    @Column(name = "claimed_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal claimedAmount;

    @Column(name = "approved_amount", precision = 15, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "incident_date", nullable = false)
    private LocalDate incidentDate;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "fraud_score")
    private Integer fraudScore;

    @Column(name = "fraud_verdict", length = 50)
    private String fraudVerdict;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fraud_factors", columnDefinition = "jsonb")
    private List<String> fraudFactors;

    @Column(name = "assigned_adjuster_id")
    private UUID assignedAdjusterId;

    @Column(name = "filed_at")
    private OffsetDateTime filedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClaimStatusHistory> statusHistory;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClaimDocument> documents;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (filedAt == null) filedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public enum ClaimStatus {
        SUBMITTED, UNDER_REVIEW, FRAUD_REVIEW, INVESTIGATION,
        APPROVED, REJECTED, SETTLED, WITHDRAWN
    }

    public enum ClaimType {
        MEDICAL_EXPENSE, HOSPITALIZATION, ACCIDENT, PROPERTY_DAMAGE,
        MARINE_DAMAGE, PUBLIC_LIABILITY, EMPLOYEE_HEALTH, GROUP_MEDICAL, OTHER
    }
}
