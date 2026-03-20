package com.insurai.workflow.repository;

import com.insurai.workflow.entity.Workflow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowRepository extends JpaRepository<Workflow, UUID> {

    Optional<Workflow> findByPolicyId(UUID policyId);

    List<Workflow> findByAssignedTo(UUID assignedTo);

    Page<Workflow> findByStatus(Workflow.WorkflowStatus status, Pageable pageable);

    Page<Workflow> findByAssignedTo(UUID assignedTo, Pageable pageable);

    Page<Workflow> findByStatusAndAssignedTo(Workflow.WorkflowStatus status, UUID assignedTo, Pageable pageable);
}
