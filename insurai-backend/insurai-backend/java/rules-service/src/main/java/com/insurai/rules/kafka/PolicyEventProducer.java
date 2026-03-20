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
public class PolicyEventProducer {

    private static final String POLICY_EVENTS_TOPIC = "policy-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishRulePassed(String policyId, String policyNumber, String holderId, String holderName,
                                   String policyType, String status) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "RULE_PASSED",
                "policyId", policyId,
                "policyNumber", policyNumber != null ? policyNumber : "",
                "holderId", holderId != null ? holderId : "",
                "holderName", holderName != null ? holderName : "",
                "policyType", policyType != null ? policyType : "",
                "status", status != null ? status : "",
                "metadata", Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published RULE_PASSED for policy {}", policyNumber);
    }

    public void publishRuleFailed(String policyId, String policyNumber, String holderId, String holderName,
                                  String policyType, String status) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", "RULE_FAILED",
                "policyId", policyId,
                "policyNumber", policyNumber != null ? policyNumber : "",
                "holderId", holderId != null ? holderId : "",
                "holderName", holderName != null ? holderName : "",
                "policyType", policyType != null ? policyType : "",
                "status", status != null ? status : "",
                "metadata", Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published RULE_FAILED for policy {}", policyNumber);
    }
}
