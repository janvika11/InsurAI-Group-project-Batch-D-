package com.insurai.rules.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluateResult {

    private String trigger;
    private List<RuleExecutionDto> executions;
    private boolean allPassed;
}
