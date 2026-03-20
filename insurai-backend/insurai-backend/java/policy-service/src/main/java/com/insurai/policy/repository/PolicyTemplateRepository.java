package com.insurai.policy.repository;

import com.insurai.policy.entity.PolicyTemplate;
import com.insurai.policy.entity.Policy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PolicyTemplateRepository extends JpaRepository<PolicyTemplate, UUID> {

    List<PolicyTemplate> findByIsActiveTrue();

    List<PolicyTemplate> findByPolicyTypeAndIsActiveTrue(Policy.PolicyType policyType);
}
