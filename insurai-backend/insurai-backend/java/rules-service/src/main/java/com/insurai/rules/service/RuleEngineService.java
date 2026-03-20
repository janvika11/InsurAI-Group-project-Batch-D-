package com.insurai.rules.service;

import com.insurai.rules.dto.EvaluateRequest;
import com.insurai.rules.dto.EvaluateResult;
import com.insurai.rules.dto.RuleExecutionDto;
import com.insurai.rules.entity.Rule;
import com.insurai.rules.entity.RuleExecution;
import com.insurai.rules.kafka.AuditEventProducer;
import com.insurai.rules.kafka.NotificationEventProducer;
import com.insurai.rules.kafka.PolicyEventProducer;
import com.insurai.rules.repository.RuleExecutionRepository;
import com.insurai.rules.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleEngineService {

    private final RuleRepository ruleRepository;
    private final RuleExecutionRepository ruleExecutionRepository;
    private final PolicyEventProducer policyEventProducer;
    private final NotificationEventProducer notificationEventProducer;
    private final AuditEventProducer auditEventProducer;

    @Transactional
    public EvaluateResult evaluateByTrigger(String trigger, UUID entityId, String entityType, Map<String, Object> data) {
        List<Rule> rules = ruleRepository.findByTriggerEventAndStatus(trigger, Rule.RuleStatus.ACTIVE);
        if (rules.isEmpty()) {
            log.debug("No active rules for trigger: {}", trigger);
            return EvaluateResult.builder()
                    .trigger(trigger)
                    .executions(List.of())
                    .allPassed(true)
                    .build();
        }

        rules.sort(Comparator.comparing(Rule::getPriority, Comparator.nullsLast(Comparator.naturalOrder())));

        List<RuleExecutionDto> executions = new ArrayList<>();
        boolean allPassed = true;

        for (Rule rule : rules) {
            boolean passed = evaluateRule(rule, data);
            RuleExecution execution = RuleExecution.builder()
                    .ruleId(rule.getId())
                    .entityId(entityId)
                    .entityType(entityType)
                    .inputData(data)
                    .outputData(Map.of("action", getAction(rule), "passed", passed))
                    .passed(passed)
                    .build();
            execution = ruleExecutionRepository.save(execution);
            executions.add(RuleExecutionDto.from(execution));

            if (!passed) {
                allPassed = false;
            }
        }

        return EvaluateResult.builder()
                .trigger(trigger)
                .executions(executions)
                .allPassed(allPassed)
                .build();
    }

    private boolean evaluateRule(Rule rule, Map<String, Object> data) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> conditions = (List<Map<String, Object>>) rule.getRuleDefinition().get("conditions");
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }

        for (Map<String, Object> cond : conditions) {
            String field = (String) cond.get("field");
            String operator = (String) cond.get("operator");
            Object expectedValue = cond.get("value");
            Object actualValue = data != null ? data.get(field) : null;

            if (!evaluateCondition(actualValue, operator, expectedValue)) {
                return false;
            }
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateCondition(Object actual, String operator, Object expected) {
        if (actual == null) {
            return "eq".equals(operator) && expected == null;
        }

        return switch (operator) {
            case "eq" -> Objects.equals(actual, expected) || (actual instanceof Number n && expected instanceof Number e && n.doubleValue() == e.doubleValue());
            case "neq" -> !Objects.equals(actual, expected);
            case "gt" -> compareNumbers(actual, expected) > 0;
            case "gte" -> compareNumbers(actual, expected) >= 0;
            case "lt" -> compareNumbers(actual, expected) < 0;
            case "lte" -> compareNumbers(actual, expected) <= 0;
            default -> false;
        };
    }

    private int compareNumbers(Object a, Object b) {
        double va = a instanceof Number n ? n.doubleValue() : Double.parseDouble(String.valueOf(a));
        double vb = b instanceof Number n ? n.doubleValue() : Double.parseDouble(String.valueOf(b));
        return Double.compare(va, vb);
    }

    private String getAction(Rule rule) {
        Object action = rule.getRuleDefinition().get("action");
        return action != null ? action.toString() : "PROCEED";
    }

    public void evaluatePolicyCreated(Map<String, Object> event) {
        String policyId = (String) event.get("policyId");
        if (policyId == null) return;

        Map<String, Object> data = buildDataFromPolicyEvent(event);
        EvaluateResult result = evaluateByTrigger("POLICY_CREATED", UUID.fromString(policyId), "POLICY", data);

        String policyNumber = (String) event.get("policyNumber");
        String holderId = (String) event.get("holderId");
        String holderName = (String) event.get("holderName");
        String policyType = (String) event.get("policyType");
        String status = (String) event.get("status");

        if (result.isAllPassed()) {
            policyEventProducer.publishRulePassed(policyId, policyNumber, holderId, holderName, policyType, status);
        } else {
            policyEventProducer.publishRuleFailed(policyId, policyNumber, holderId, holderName, policyType, status);
            notificationEventProducer.publishComplianceAlert(policyId, holderId, holderName, policyNumber);
        }
        auditEventProducer.publishRuleExecuted(policyId, result);
    }

    public void evaluateRiskEvaluated(Map<String, Object> event) {
        String policyId = (String) event.get("policyId");
        if (policyId == null) return;

        Object riskScoreObj = event.get("riskScore");
        Integer riskScore = riskScoreObj != null ? ((Number) riskScoreObj).intValue() : null;
        String policyNumber = (String) event.get("policyNumber");

        Map<String, Object> data = buildDataFromRiskResult(event);
        EvaluateResult result = evaluateByTrigger("RISK_EVALUATED", UUID.fromString(policyId), "POLICY", data);

        String holderId = (String) event.get("holderId");
        String holderName = (String) event.get("holderName");
        String policyType = (String) event.get("policyType");
        String status = "PENDING_REVIEW";

        if (result.isAllPassed()) {
            policyEventProducer.publishRulePassed(policyId, policyNumber, holderId, holderName, policyType, status);
        } else {
            policyEventProducer.publishRuleFailed(policyId, policyNumber, holderId, holderName, policyType, status);
            notificationEventProducer.publishComplianceAlert(policyId, holderId, holderName, policyNumber);
        }
        auditEventProducer.publishRuleExecuted(policyId, result);
    }

    private Map<String, Object> buildDataFromPolicyEvent(Map<String, Object> event) {
        Map<String, Object> data = new HashMap<>();
        Object metadata = event.get("metadata");
        if (metadata instanceof Map<?, ?> m) {
            data.putAll((Map<String, Object>) m);
        }
        data.put("status", event.get("status"));
        data.put("policyType", event.get("policyType"));
        return data;
    }

    private Map<String, Object> buildDataFromRiskResult(Map<String, Object> event) {
        Map<String, Object> data = new HashMap<>();
        data.put("risk_score", event.get("riskScore"));
        data.put("recommendation", event.get("recommendation"));
        data.put("label", event.get("label"));
        return data;
    }
}
