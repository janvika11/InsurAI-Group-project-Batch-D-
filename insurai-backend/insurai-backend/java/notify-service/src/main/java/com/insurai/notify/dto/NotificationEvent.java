package com.insurai.notify.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

/**
 * DTO matching notification-events schema from KAFKA_SCHEMAS.md
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NotificationEvent {

    private String eventId;
    private String eventType;  // POLICY_APPROVED | POLICY_REJECTED | CLAIM_SUBMITTED | CLAIM_APPROVED | CLAIM_FRAUD_FLAGGED | RENEWAL_REMINDER | WORKFLOW_ASSIGNED | COMPLIANCE_ALERT
    private String recipientId;
    private String recipientEmail;
    private String recipientName;
    private String channel;   // EMAIL
    private String subject;
    private String templateName;
    private Map<String, Object> templateData;
    private String timestamp;
}
