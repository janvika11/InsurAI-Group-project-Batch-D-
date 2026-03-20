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
public class PolicyEventConsumer {

    private final WorkflowService workflowService;

    @KafkaListener(topics = "policy-events", groupId = "workflow-service-group")
    public void consumePolicyEvent(Map<String, Object> payload) {
        try {
            String eventType = (String) payload.get("eventType");
            if (!"POLICY_CREATED".equals(eventType)) {
                return;
            }

            String policyId = (String) payload.get("policyId");
            String policyNumber = (String) payload.get("policyNumber");
            String holderId = (String) payload.get("holderId");
            String holderName = (String) payload.get("holderName");
            String policyType = (String) payload.get("policyType");
            if (policyId == null || policyNumber == null) {
                log.warn("Received POLICY_CREATED without policyId or policyNumber");
                return;
            }

            workflowService.createWorkflowOnPolicyCreated(policyId, policyNumber, holderId, holderName, policyType);
        } catch (Exception e) {
            log.error("Error processing policy event: {}", e.getMessage());
        }
    }
}
