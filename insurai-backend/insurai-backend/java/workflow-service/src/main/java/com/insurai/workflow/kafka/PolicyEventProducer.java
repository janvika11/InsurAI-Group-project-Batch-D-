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
public class PolicyEventProducer {

    private static final String POLICY_EVENTS_TOPIC = "policy-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishWorkflowApproved(String policyId, String policyNumber, String holderId, String holderName,
                                        String policyType) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "WORKFLOW_APPROVED",
                "policyId", policyId,
                "policyNumber", policyNumber != null ? policyNumber : "",
                "holderId", holderId != null ? holderId : "",
                "holderName", holderName != null ? holderName : "",
                "policyType", policyType != null ? policyType : "",
                "status", "APPROVED",
                "metadata", Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published WORKFLOW_APPROVED for policy {}", policyNumber);
    }

    public void publishWorkflowRejected(String policyId, String policyNumber, String holderId, String holderName,
                                   String policyType, String reason) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "WORKFLOW_REJECTED",
                "policyId", policyId,
                "policyNumber", policyNumber != null ? policyNumber : "",
                "holderId", holderId != null ? holderId : "",
                "holderName", holderName != null ? holderName : "",
                "policyType", policyType != null ? policyType : "",
                "status", "REJECTED",
                "metadata", Map.of("reason", reason != null ? reason : ""),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published WORKFLOW_REJECTED for policy {}", policyNumber);
    }
}
