package com.insurai.claims.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ClaimDocumentDto {

    private UUID id;
    private String documentName;
    private String documentType;
    private String filePath;
    private UUID uploadedBy;
    private OffsetDateTime createdAt;
}
