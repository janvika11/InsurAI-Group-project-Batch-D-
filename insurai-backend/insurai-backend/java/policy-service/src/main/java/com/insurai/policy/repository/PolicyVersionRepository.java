package com.insurai.policy.repository;

import com.insurai.policy.entity.PolicyVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PolicyVersionRepository extends JpaRepository<PolicyVersion, UUID> {

    List<PolicyVersion> findByPolicyIdOrderByVersionNumberDesc(UUID policyId);
}
