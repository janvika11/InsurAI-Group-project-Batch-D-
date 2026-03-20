package com.insurai.claims.controller;

import com.insurai.claims.dto.*;
import com.insurai.claims.entity.Claim;
import com.insurai.claims.service.ClaimService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CreateClaimResponse create(
            @RequestParam("policyId") UUID policyId,
            @RequestParam("policyNumber") String policyNumber,
            @RequestParam("holderId") UUID holderId,
            @RequestParam("holderName") String holderName,
            @RequestParam("claimType") Claim.ClaimType claimType,
            @RequestParam("incidentDate") LocalDate incidentDate,
            @RequestParam("claimedAmount") BigDecimal claimedAmount,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "documents", required = false) List<MultipartFile> documents,
            Authentication auth) throws Exception {
        UUID userId = UUID.fromString(auth.getName());
        List<MultipartFile> files = documents != null ? documents : new ArrayList<>();
        return claimService.create(policyId, policyNumber, holderId, holderName,
                claimType, incidentDate, claimedAmount, description, files, userId);
    }

    @GetMapping
    public Page<ClaimSummaryDto> list(
            @RequestParam(required = false) UUID holderId,
            @RequestParam(required = false) UUID policyId,
            @RequestParam(required = false) Claim.ClaimStatus status,
            Pageable pageable,
            Authentication auth) {
        String userId = auth != null ? auth.getName() : null;
        List<String> roles = auth != null ? auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()) : List.of();
        return claimService.list(holderId, policyId, status, userId, roles, pageable);
    }

    @GetMapping("/my")
    public Page<ClaimSummaryDto> getMy(Pageable pageable, Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return claimService.getMy(userId, pageable);
    }

    @GetMapping("/{id}")
    public ClaimDto get(@PathVariable UUID id) {
        return claimService.get(id);
    }

    @PutMapping("/{id}/status")
    public ClaimDto updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateClaimStatusRequest request,
                                  Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return claimService.updateStatus(id, request, userId);
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ClaimDocumentDto addDocument(@PathVariable UUID id, @RequestParam("file") MultipartFile file,
                                         Authentication auth) throws Exception {
        UUID userId = UUID.fromString(auth.getName());
        return claimService.addDocument(id, file, userId);
    }

    @GetMapping("/{id}/documents")
    public List<ClaimDocumentDto> getDocuments(@PathVariable UUID id) {
        return claimService.getDocuments(id);
    }
}
