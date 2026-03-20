package com.insurai.renewal.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventProducer {

    private static final String NOTIFICATION_EVENTS_TOPIC = "notification-events";
    private static final String POLICY_EVENTS_TOPIC = "policy-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishRenewalReminder(String recipientId, String recipientEmail, String recipientName,
                                       String policyNumber, String policyId, int daysUntilExpiry) {
        Map<String, Object> event = Map.of(
                "eventType", "RENEWAL_REMINDER",
                "recipientId", recipientId,
                "recipientEmail", recipientEmail != null ? recipientEmail : "",
                "recipientName", recipientName != null ? recipientName : "",
                "policyNumber", policyNumber,
                "policyId", policyId,
                "daysUntilExpiry", daysUntilExpiry,
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published RENEWAL_REMINDER for policy {} to {}", policyNumber, recipientId);
    }

    public void publishRenewalInitiated(String policyId, String policyNumber, String holderId) {
        Map<String, Object> event = Map.of(
                "eventId", java.util.UUID.randomUUID().toString(),
                "eventType", "RENEWAL_INITIATED",
                "policyId", policyId,
                "policyNumber", policyNumber,
                "holderId", holderId,
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published RENEWAL_INITIATED for policy {}", policyNumber);
    }
}
