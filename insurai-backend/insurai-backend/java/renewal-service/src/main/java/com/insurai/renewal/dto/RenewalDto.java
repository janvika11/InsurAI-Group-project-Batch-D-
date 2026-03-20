package com.insurai.renewal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RenewalDto {

    private UUID id;
    private UUID policyId;
    private String policyNumber;
    private UUID holderId;
    private String holderEmail;
    private LocalDate expiryDate;
    private String renewalStatus;
    private OffsetDateTime lastRemindedAt;
    private OffsetDateTime renewedAt;
    private OffsetDateTime createdAt;
    private List<RenewalQuoteDto> quotes;
}
