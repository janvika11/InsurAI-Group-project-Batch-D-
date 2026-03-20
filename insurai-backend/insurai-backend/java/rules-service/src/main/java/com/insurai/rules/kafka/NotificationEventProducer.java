package com.insurai.rules.kafka;

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

    public void publishComplianceAlert(String policyId, String recipientId, String recipientName, String policyNumber) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "COMPLIANCE_ALERT",
                "recipientId", recipientId != null ? recipientId : "",
                "recipientEmail", "",
                "recipientName", recipientName != null ? recipientName : "",
                "channel", "EMAIL",
                "subject", "Compliance alert for policy " + policyNumber,
                "templateName", "compliance-alert",
                "templateData", Map.of(
                        "policyNumber", policyNumber != null ? policyNumber : "",
                        "holderName", recipientName != null ? recipientName : ""
                ),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published compliance alert for policy {}", policyNumber);
    }
}
