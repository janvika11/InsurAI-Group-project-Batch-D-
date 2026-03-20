package com.insurai.policy.kafka;

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
    private static final String RISK_EVALUATION_REQUESTS_TOPIC = "risk-evaluation-requests";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishPolicyEvent(String eventType, String policyId, String policyNumber,
                                   String holderId, String holderName, String policyType,
                                   String status, Map<String, Object> metadata) {
        Map<String, Object> event = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", eventType,
                "policyId", policyId,
                "policyNumber", policyNumber,
                "holderId", holderId,
                "holderName", holderName,
                "policyType", policyType,
                "status", status,
                "metadata", metadata != null ? metadata : Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(POLICY_EVENTS_TOPIC, policyId, event);
        log.info("Published policy event: {} for policy {}", eventType, policyNumber);
    }

    public void publishRiskEvaluationRequest(String policyId, String policyNumber, String policyType,
                                             Map<String, Object> features) {
        String requestId = UUID.randomUUID().toString();
        Map<String, Object> request = Map.of(
                "requestId", requestId,
                "policyId", policyId,
                "policyNumber", policyNumber,
                "policyType", policyType,
                "features", features != null ? features : Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(RISK_EVALUATION_REQUESTS_TOPIC, requestId, request);
        log.info("Published risk evaluation request for policy {}", policyNumber);
    }
}
