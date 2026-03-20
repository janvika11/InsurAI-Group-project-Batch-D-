package com.insurai.renewal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "renewals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Renewal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "policy_id", nullable = false)
    private UUID policyId;

    @Column(name = "policy_number", nullable = false, length = 50)
    private String policyNumber;

    @Column(name = "holder_id", nullable = false)
    private UUID holderId;

    @Column(name = "holder_email")
    private String holderEmail;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "renewal_status", length = 50)
    private String renewalStatus;

    @Column(name = "last_reminded_at")
    private OffsetDateTime lastRemindedAt;

    @Column(name = "renewed_at")
    private OffsetDateTime renewedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "renewal", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RenewalQuote> quotes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (renewalStatus == null) renewalStatus = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
