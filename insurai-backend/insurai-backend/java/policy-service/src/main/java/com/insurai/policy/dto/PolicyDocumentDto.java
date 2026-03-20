package com.insurai.policy.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class PolicyDocumentDto {

    private UUID id;
    private String documentName;
    private String documentType;
    private String filePath;
    private OffsetDateTime createdAt;
}
