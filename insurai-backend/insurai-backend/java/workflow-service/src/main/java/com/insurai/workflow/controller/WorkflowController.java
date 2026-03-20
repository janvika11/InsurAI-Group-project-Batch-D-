package com.insurai.workflow.controller;

import com.insurai.workflow.dto.*;
import com.insurai.workflow.entity.Workflow;
import com.insurai.workflow.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'ADMIN')")
    public ResponseEntity<Page<WorkflowDto>> list(
            @RequestParam(required = false) Workflow.WorkflowStatus status,
            @RequestParam(required = false) UUID assignedTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(workflowService.list(status, assignedTo, pageable));
    }

    @GetMapping("/policy/{policyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WorkflowDto> getByPolicyId(@PathVariable UUID policyId) {
        return ResponseEntity.ok(workflowService.getByPolicyId(policyId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WorkflowDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.getById(id));
    }

    @GetMapping("/my-queue")
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'ADMIN')")
    public ResponseEntity<List<WorkflowDto>> getMyQueue(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(workflowService.getMyQueue(userId));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkflowDto> assign(@PathVariable UUID id, @Valid @RequestBody AssignRequest request) {
        return ResponseEntity.ok(workflowService.assign(id, request.getUnderwriterId()));
    }

    @PutMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'ADMIN')")
    public ResponseEntity<WorkflowDto> decision(@PathVariable UUID id, @Valid @RequestBody DecisionRequest request,
                                                Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(workflowService.decision(id, request.getDecision(), request.getNotes(), userId));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<WorkflowStepDto>> getHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.getHistory(id));
    }
}
