package com.insurai.rules.controller;

import com.insurai.rules.dto.*;
import com.insurai.rules.service.RuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RulesController {

    private final RuleService ruleService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RuleDto>> list() {
        return ResponseEntity.ok(ruleService.listAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RuleDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ruleService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RuleDto> create(@Valid @RequestBody CreateRuleRequest request, Authentication auth) {
        UUID userId = null;
        if (auth != null && auth.getName() != null && !auth.getName().isEmpty()) {
            try {
                userId = UUID.fromString(auth.getName());
            } catch (IllegalArgumentException ignored) {}
        }
        RuleDto created = ruleService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RuleDto> update(@PathVariable UUID id, @Valid @RequestBody UpdateRuleRequest request) {
        return ResponseEntity.ok(ruleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        ruleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/evaluate")
    @PreAuthorize("hasAnyRole('ADMIN', 'UNDERWRITER')")
    public ResponseEntity<EvaluateResult> evaluate(@Valid @RequestBody EvaluateRequest request) {
        return ResponseEntity.ok(ruleService.evaluate(request));
    }

    @GetMapping("/executions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<RuleExecutionDto>> getExecutions(
            @RequestParam UUID entityId,
            @RequestParam(required = false, defaultValue = "POLICY") String entityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ruleService.getExecutions(entityId, entityType, pageable));
    }
}
