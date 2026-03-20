package com.insurai.renewal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class RenewalSummaryDto {

    private UUID id;
    private UUID policyId;
    private String policyNumber;
    private UUID holderId;
    private LocalDate expiryDate;
    private String renewalStatus;
    private OffsetDateTime lastRemindedAt;
}
