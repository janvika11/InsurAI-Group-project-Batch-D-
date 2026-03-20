package com.insurai.workflow.kafka;

import com.insurai.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RiskResultConsumer {

    private final WorkflowService workflowService;

    @KafkaListener(topics = "risk-evaluation-results", groupId = "workflow-service-group")
    public void consumeRiskResult(Map<String, Object> payload) {
        try {
            String policyId = (String) payload.get("policyId");
            if (policyId == null) {
                log.warn("Received risk result without policyId");
                return;
            }

            Object riskScoreObj = payload.get("riskScore");
            Integer riskScore = riskScoreObj != null ? ((Number) riskScoreObj).intValue() : null;

            workflowService.updateWorkflowOnRiskResult(policyId, riskScore);
        } catch (Exception e) {
            log.error("Error processing risk evaluation result: {}", e.getMessage());
        }
    }
}
