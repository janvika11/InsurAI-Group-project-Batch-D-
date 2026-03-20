package com.insurai.policy.kafka;

import com.insurai.policy.entity.Policy;
import com.insurai.policy.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class RiskResultConsumer {

    private final PolicyRepository policyRepository;

    @KafkaListener(topics = "risk-evaluation-results", groupId = "policy-service-group")
    public void consumeRiskResult(Map<String, Object> payload) {
        try {
            String policyIdStr = (String) payload.get("policyId");
            Object riskScoreObj = payload.get("riskScore");
            String recommendation = (String) payload.get("recommendation");

            if (policyIdStr == null) {
                log.warn("Received risk result without policyId");
                return;
            }

            Integer riskScore = riskScoreObj != null ? ((Number) riskScoreObj).intValue() : null;

            UUID policyId = UUID.fromString(policyIdStr);
            Policy policy = policyRepository.findById(policyId)
                    .orElseThrow(() -> new RuntimeException("Policy not found: " + policyId));

            policy.setRiskScore(riskScore);
            policy.setAiRecommendation(recommendation);
            policy.setStatus(Policy.PolicyStatus.PENDING_REVIEW);
            policyRepository.save(policy);

            log.info("Updated policy {} with risk score {} and recommendation {}",
                    policy.getPolicyNumber(), riskScore, recommendation);
        } catch (Exception e) {
            log.error("Error processing risk evaluation result: {}", e.getMessage());
        }
    }
}
