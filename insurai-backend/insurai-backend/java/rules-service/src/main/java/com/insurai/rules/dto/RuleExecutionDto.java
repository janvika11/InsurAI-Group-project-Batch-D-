package com.insurai.rules.dto;

import com.insurai.rules.entity.RuleExecution;
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
public class RuleExecutionDto {

    private UUID id;
    private UUID ruleId;
    private UUID entityId;
    private String entityType;
    private Map<String, Object> inputData;
    private Map<String, Object> outputData;
    private Boolean passed;
    private OffsetDateTime executedAt;

    public static RuleExecutionDto from(RuleExecution execution) {
        return RuleExecutionDto.builder()
                .id(execution.getId())
                .ruleId(execution.getRuleId())
                .entityId(execution.getEntityId())
                .entityType(execution.getEntityType())
                .inputData(execution.getInputData())
                .outputData(execution.getOutputData())
                .passed(execution.getPassed())
                .executedAt(execution.getExecutedAt())
                .build();
    }
}
