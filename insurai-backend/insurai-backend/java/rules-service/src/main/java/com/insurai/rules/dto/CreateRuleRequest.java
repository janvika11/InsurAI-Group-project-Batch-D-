package com.insurai.rules.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRuleRequest {

    @NotBlank
    private String ruleCode;

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String triggerEvent;

    @NotNull
    private Map<String, Object> ruleDefinition;

    private Integer priority;
}
