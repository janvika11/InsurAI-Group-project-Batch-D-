package com.insurai.workflow.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventProducer {

    private static final String NOTIFICATION_EVENTS_TOPIC = "notification-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishWorkflowAssigned(String recipientId, String recipientEmail, String recipientName,
                                        String policyNumber) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "WORKFLOW_ASSIGNED",
                "recipientId", recipientId != null ? recipientId : "",
                "recipientEmail", recipientEmail != null ? recipientEmail : "",
                "recipientName", recipientName != null ? recipientName : "",
                "channel", "EMAIL",
                "subject", "Workflow assigned: Policy " + policyNumber,
                "templateName", "workflow-assigned",
                "templateData", Map.of(
                        "policyNumber", policyNumber != null ? policyNumber : "",
                        "holderName", recipientName != null ? recipientName : ""
                ),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published WORKFLOW_ASSIGNED for policy {}", policyNumber);
    }

    public void publishPolicyApproved(String recipientId, String recipientEmail, String recipientName,
                                      String policyNumber) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "POLICY_APPROVED",
                "recipientId", recipientId != null ? recipientId : "",
                "recipientEmail", recipientEmail != null ? recipientEmail : "",
                "recipientName", recipientName != null ? recipientName : "",
                "channel", "EMAIL",
                "subject", "Your policy " + policyNumber + " has been approved",
                "templateName", "policy-approved",
                "templateData", Map.of(
                        "policyNumber", policyNumber != null ? policyNumber : "",
                        "holderName", recipientName != null ? recipientName : ""
                ),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published POLICY_APPROVED notification for policy {}", policyNumber);
    }

    public void publishPolicyRejected(String recipientId, String recipientEmail, String recipientName,
                                      String policyNumber, String reason) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "POLICY_REJECTED",
                "recipientId", recipientId != null ? recipientId : "",
                "recipientEmail", recipientEmail != null ? recipientEmail : "",
                "recipientName", recipientName != null ? recipientName : "",
                "channel", "EMAIL",
                "subject", "Your policy " + policyNumber + " has been rejected",
                "templateName", "policy-rejected",
                "templateData", Map.of(
                        "policyNumber", policyNumber != null ? policyNumber : "",
                        "holderName", recipientName != null ? recipientName : "",
                        "reason", reason != null ? reason : ""
                ),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published POLICY_REJECTED notification for policy {}", policyNumber);
    }
}
