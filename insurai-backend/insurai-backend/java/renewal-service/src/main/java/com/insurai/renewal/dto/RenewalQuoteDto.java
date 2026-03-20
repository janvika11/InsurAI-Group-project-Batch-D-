package com.insurai.renewal.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class RenewalQuoteDto {

    private UUID id;
    private BigDecimal quotedPremium;
    private LocalDate quoteValidUntil;
    private BigDecimal discountPercent;
    private Boolean accepted;
    private OffsetDateTime createdAt;
}
