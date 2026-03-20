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
public class RiskResultConsumer {

    private final RuleEngineService ruleEngineService;

    @KafkaListener(topics = "risk-evaluation-results", groupId = "rules-service-group")
    public void consumeRiskResult(Map<String, Object> payload) {
        try {
            ruleEngineService.evaluateRiskEvaluated(payload);
        } catch (Exception e) {
            log.error("Error processing risk evaluation result: {}", e.getMessage());
        }
    }
}
