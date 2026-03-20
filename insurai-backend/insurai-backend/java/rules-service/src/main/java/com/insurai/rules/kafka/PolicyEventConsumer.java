package com.insurai.rules.kafka;

import com.insurai.rules.service.RuleEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class PolicyEventConsumer {

    private final RuleEngineService ruleEngineService;

    @KafkaListener(topics = "policy-events", groupId = "rules-service-group")
    public void consumePolicyEvent(Map<String, Object> payload) {
        try {
            String eventType = (String) payload.get("eventType");
            if (!"POLICY_CREATED".equals(eventType)) {
                return;
            }

            ruleEngineService.evaluatePolicyCreated(payload);
        } catch (Exception e) {
            log.error("Error processing policy event: {}", e.getMessage());
        }
    }
}
