package com.insurai.rules.service;

import com.insurai.rules.dto.*;
import com.insurai.rules.entity.Rule;
import com.insurai.rules.repository.RuleExecutionRepository;
import com.insurai.rules.repository.RuleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RuleService {

    private final RuleRepository ruleRepository;
    private final RuleExecutionRepository ruleExecutionRepository;
    private final RuleEngineService ruleEngineService;

    public List<RuleDto> listAll() {
        return ruleRepository.findAll().stream()
                .map(RuleDto::from)
                .toList();
    }

    public RuleDto get(UUID id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        return RuleDto.from(rule);
    }

    @Transactional
    public RuleDto create(CreateRuleRequest request, UUID createdBy) {
        if (ruleRepository.findByRuleCode(request.getRuleCode()).isPresent()) {
            throw new IllegalArgumentException("Rule code already exists: " + request.getRuleCode());
        }
        Rule rule = Rule.builder()
                .ruleCode(request.getRuleCode())
                .name(request.getName())
                .description(request.getDescription())
                .triggerEvent(request.getTriggerEvent())
                .ruleDefinition(request.getRuleDefinition())
                .priority(request.getPriority() != null ? request.getPriority() : 100)
                .status(Rule.RuleStatus.ACTIVE)
                .createdBy(createdBy)
                .build();
        rule = ruleRepository.save(rule);
        return RuleDto.from(rule);
    }

    @Transactional
    public RuleDto update(UUID id, UpdateRuleRequest request) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setTriggerEvent(request.getTriggerEvent());
        rule.setRuleDefinition(request.getRuleDefinition());
        if (request.getPriority() != null) {
            rule.setPriority(request.getPriority());
        }
        rule = ruleRepository.save(rule);
        return RuleDto.from(rule);
    }

    @Transactional
    public void delete(UUID id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        rule.setStatus(Rule.RuleStatus.DISABLED);
        ruleRepository.save(rule);
    }

    public EvaluateResult evaluate(EvaluateRequest request) {
        return ruleEngineService.evaluateByTrigger(
                request.getTrigger(),
                request.getEntityId(),
                "POLICY",
                request.getData() != null ? request.getData() : java.util.Map.of()
        );
    }

    public Page<RuleExecutionDto> getExecutions(UUID entityId, String entityType, Pageable pageable) {
        return ruleExecutionRepository.findByEntityIdAndEntityType(entityId, entityType, pageable)
                .map(RuleExecutionDto::from);
    }

    public Page<RuleExecutionDto> getExecutionsByRule(UUID ruleId, Pageable pageable) {
        return ruleExecutionRepository.findByRuleId(ruleId, pageable)
                .map(RuleExecutionDto::from);
    }
}
