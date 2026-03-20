package com.insurai.rules.repository;

import com.insurai.rules.entity.Rule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuleRepository extends JpaRepository<Rule, UUID> {

    Optional<Rule> findByRuleCode(String ruleCode);

    List<Rule> findByTriggerEventAndStatus(String triggerEvent, Rule.RuleStatus status);

    Page<Rule> findByStatus(Rule.RuleStatus status, Pageable pageable);
}
