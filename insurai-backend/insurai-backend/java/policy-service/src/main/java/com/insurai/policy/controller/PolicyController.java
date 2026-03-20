package com.insurai.policy.controller;

import com.insurai.policy.dto.*;
import com.insurai.policy.entity.Policy;
import com.insurai.policy.service.PolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/policies")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<CreatePolicyResponse> create(@Valid @RequestBody CreatePolicyRequest request,
                                                       Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        CreatePolicyResponse response = policyService.create(request, userId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'ADMIN')")
    public ResponseEntity<Page<PolicySummaryDto>> list(
            @RequestParam(required = false) Policy.PolicyStatus status,
            @RequestParam(required = false) UUID holderId,
            @RequestParam(required = false) Policy.PolicyType policyType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        String[] sortParams = sort.split(",");
        Sort s = sortParams.length == 2
                ? Sort.by(Sort.Direction.fromString(sortParams[1]), sortParams[0])
                : Sort.by("createdAt").descending();
        Pageable pageable = PageRequest.of(page, size, s);
        Page<PolicySummaryDto> result = policyService.list(status, holderId, policyType, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Page<PolicySummaryDto>> getMy(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID holderId = UUID.fromString(auth.getName());
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PolicySummaryDto> result = policyService.getMy(holderId, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PolicyDto> get(@PathVariable UUID id) {
        PolicyDto policy = policyService.get(id);
        return ResponseEntity.ok(policy);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'ADMIN')")
    public ResponseEntity<PolicyDto> updateStatus(@PathVariable UUID id,
                                                   @Valid @RequestBody UpdateStatusRequest request) {
        PolicyDto policy = policyService.updateStatus(id, request);
        return ResponseEntity.ok(policy);
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PolicyDocumentDto>> getDocuments(@PathVariable UUID id) {
        List<PolicyDocumentDto> documents = policyService.getDocuments(id);
        return ResponseEntity.ok(documents);
    }
}
