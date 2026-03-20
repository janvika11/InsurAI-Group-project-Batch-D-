package com.insurai.rules.repository;

import com.insurai.rules.entity.RuleExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RuleExecutionRepository extends JpaRepository<RuleExecution, UUID> {

    List<RuleExecution> findByEntityIdAndEntityType(UUID entityId, String entityType);

    Page<RuleExecution> findByEntityIdAndEntityType(UUID entityId, String entityType, Pageable pageable);

    Page<RuleExecution> findByRuleId(UUID ruleId, Pageable pageable);
}
