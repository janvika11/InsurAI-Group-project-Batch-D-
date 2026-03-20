package com.insurai.rules.dto;

import com.insurai.rules.entity.Rule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleDto {

    private UUID id;
    private String ruleCode;
    private String name;
    private String description;
    private String triggerEvent;
    private Map<String, Object> ruleDefinition;
    private Integer priority;
    private Rule.RuleStatus status;
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static RuleDto from(Rule rule) {
        return RuleDto.builder()
                .id(rule.getId())
                .ruleCode(rule.getRuleCode())
                .name(rule.getName())
                .description(rule.getDescription())
                .triggerEvent(rule.getTriggerEvent())
                .ruleDefinition(rule.getRuleDefinition())
                .priority(rule.getPriority())
                .status(rule.getStatus())
                .createdBy(rule.getCreatedBy())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
