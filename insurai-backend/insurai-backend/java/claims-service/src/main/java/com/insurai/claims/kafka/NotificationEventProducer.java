package com.insurai.claims.kafka;

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

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishClaimStatusChanged(String recipientId, String recipientEmail,
                                          String claimNumber, String newStatus) {
        Map<String, Object> event = Map.of(
                "eventType", "CLAIM_STATUS_CHANGED",
                "recipientId", recipientId,
                "recipientEmail", recipientEmail != null ? recipientEmail : "",
                "claimNumber", claimNumber,
                "newStatus", newStatus,
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(NOTIFICATION_EVENTS_TOPIC, recipientId, event);
        log.info("Published CLAIM_STATUS_CHANGED for claim {} to {}", claimNumber, recipientId);
    }
}
