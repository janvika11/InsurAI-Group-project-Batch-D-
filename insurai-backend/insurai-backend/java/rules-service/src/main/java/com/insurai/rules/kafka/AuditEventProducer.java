package com.insurai.rules.kafka;

import com.insurai.rules.dto.EvaluateResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditEventProducer {

    private static final String AUDIT_EVENTS_TOPIC = "audit-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishRuleExecuted(String resourceId, EvaluateResult result) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("eventType", "RULE_EXECUTED");
        event.put("userId", "");
        event.put("userEmail", "");
        event.put("userRole", "SYSTEM");
        event.put("resourceType", "POLICY");
        event.put("resourceId", resourceId);
        event.put("action", "EVALUATE");
        event.put("details", Map.of(
                "trigger", result.getTrigger(),
                "allPassed", result.isAllPassed(),
                "executionCount", result.getExecutions() != null ? result.getExecutions().size() : 0
        ));
        event.put("timestamp", Instant.now().toString());

        kafkaTemplate.send(AUDIT_EVENTS_TOPIC, resourceId, event);
        log.debug("Published RULE_EXECUTED audit for resource {}", resourceId);
    }
}
