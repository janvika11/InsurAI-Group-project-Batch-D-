package com.insurai.claims.service;

import com.insurai.claims.dto.*;
import com.insurai.claims.entity.Claim;
import com.insurai.claims.entity.ClaimDocument;
import com.insurai.claims.entity.ClaimStatusHistory;
import com.insurai.claims.kafka.FraudCheckProducer;
import com.insurai.claims.kafka.NotificationEventProducer;
import com.insurai.claims.repository.ClaimDocumentRepository;
import com.insurai.claims.repository.ClaimRepository;
import com.insurai.claims.repository.ClaimStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ClaimStatusHistoryRepository statusHistoryRepository;
    private final ClaimDocumentRepository documentRepository;
    private final ClaimNumberGenerator claimNumberGenerator;
    private final DocumentStorageService documentStorageService;
    private final FraudCheckProducer fraudCheckProducer;
    private final NotificationEventProducer notificationEventProducer;

    @Transactional
    public CreateClaimResponse create(UUID policyId, String policyNumber, UUID holderId, String holderName,
                                       Claim.ClaimType claimType, java.time.LocalDate incidentDate,
                                       java.math.BigDecimal claimedAmount, String description,
                                       List<MultipartFile> documents, UUID filedBy) throws IOException {
        String claimNumber = claimNumberGenerator.generate();
        Claim claim = Claim.builder()
                .claimNumber(claimNumber)
                .policyId(policyId)
                .policyNumber(policyNumber)
                .holderId(holderId)
                .holderName(holderName)
                .claimType(claimType)
                .status(Claim.ClaimStatus.SUBMITTED)
                .claimedAmount(claimedAmount)
                .incidentDate(incidentDate)
                .description(description)
                .build();
        claim = claimRepository.save(claim);

        if (documents != null && !documents.isEmpty()) {
            for (MultipartFile file : documents) {
                if (!file.isEmpty()) {
                    String filePath = documentStorageService.save(file, claim.getId(), filedBy);
                    ClaimDocument doc = ClaimDocument.builder()
                            .claim(claim)
                            .documentName(file.getOriginalFilename())
                            .documentType(file.getContentType())
                            .filePath(filePath)
                            .uploadedBy(filedBy)
                            .build();
                    documentRepository.save(doc);
                }
            }
        }

        Map<String, Object> holderHistory = Map.of(
                "totalPastClaims", claimRepository.countByHolderId(holderId),
                "avgClaimAmount", claimedAmount.doubleValue()
        );
        fraudCheckProducer.publishFraudCheckRequest(claim, holderHistory);

        return CreateClaimResponse.builder()
                .id(claim.getId())
                .claimNumber(claimNumber)
                .status(Claim.ClaimStatus.SUBMITTED)
                .fraudScore(null)
                .message("Claim submitted. Fraud analysis in progress.")
                .build();
    }

    public Page<ClaimSummaryDto> list(UUID holderId, UUID policyId, Claim.ClaimStatus status,
                                       String userId, List<String> roles, Pageable pageable) {
        boolean isCustomer = roles != null && roles.stream()
                .anyMatch(r -> "CUSTOMER".equalsIgnoreCase(r.replace("ROLE_", "")));
        if (isCustomer) {
            UUID filterHolderId = (holderId != null) ? holderId : (userId != null ? UUID.fromString(userId) : null);
            if (filterHolderId == null) {
                return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, 0);
            }
            return claimRepository.findByHolderId(filterHolderId, pageable)
                    .map(this::toSummaryDto);
        }
        final UUID fHolderId = holderId;
        final UUID fPolicyId = policyId;
        final Claim.ClaimStatus fStatus = status;
        Specification<Claim> spec = Specification.where(null);
        if (fHolderId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("holderId"), fHolderId));
        }
        if (fPolicyId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("policyId"), fPolicyId));
        }
        if (fStatus != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), fStatus));
        }
        return claimRepository.findAll(spec, pageable).map(this::toSummaryDto);
    }

    public ClaimDto get(UUID id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        return toDto(claim);
    }

    public Page<ClaimSummaryDto> getMy(UUID userId, Pageable pageable) {
        return claimRepository.findByHolderId(userId, pageable).map(this::toSummaryDto);
    }

    @Transactional
    public ClaimDto updateStatus(UUID id, UpdateClaimStatusRequest request, UUID changedBy) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));

        Claim.ClaimStatus oldStatus = claim.getStatus();
        claim.setStatus(request.getStatus());
        if (request.getApprovedAmount() != null) {
            claim.setApprovedAmount(request.getApprovedAmount());
        }
        if (request.getStatus() == Claim.ClaimStatus.APPROVED || request.getStatus() == Claim.ClaimStatus.REJECTED
                || request.getStatus() == Claim.ClaimStatus.SETTLED) {
            claim.setResolvedAt(OffsetDateTime.now());
        }

        ClaimStatusHistory history = ClaimStatusHistory.builder()
                .claim(claim)
                .fromStatus(oldStatus)
                .toStatus(request.getStatus())
                .changedBy(changedBy)
                .note(request.getNote())
                .build();
        statusHistoryRepository.save(history);
        claimRepository.save(claim);

        notificationEventProducer.publishClaimStatusChanged(
                claim.getHolderId().toString(), null, claim.getClaimNumber(), request.getStatus().name());

        return toDto(claimRepository.findById(id).orElseThrow());
    }

    @Transactional
    public ClaimDocumentDto addDocument(UUID claimId, MultipartFile file, UUID uploadedBy) throws IOException {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + claimId));

        String filePath = documentStorageService.save(file, claimId, uploadedBy);
        ClaimDocument doc = ClaimDocument.builder()
                .claim(claim)
                .documentName(file.getOriginalFilename())
                .documentType(file.getContentType())
                .filePath(filePath)
                .uploadedBy(uploadedBy)
                .build();
        doc = documentRepository.save(doc);
        return ClaimDocumentDto.builder()
                .id(doc.getId())
                .documentName(doc.getDocumentName())
                .documentType(doc.getDocumentType())
                .filePath(doc.getFilePath())
                .uploadedBy(doc.getUploadedBy())
                .createdAt(doc.getCreatedAt())
                .build();
    }

    public List<ClaimDocumentDto> getDocuments(UUID claimId) {
        return documentRepository.findByClaim_Id(claimId).stream()
                .map(d -> ClaimDocumentDto.builder()
                        .id(d.getId())
                        .documentName(d.getDocumentName())
                        .documentType(d.getDocumentType())
                        .filePath(d.getFilePath())
                        .uploadedBy(d.getUploadedBy())
                        .createdAt(d.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private ClaimSummaryDto toSummaryDto(Claim c) {
        return ClaimSummaryDto.builder()
                .id(c.getId())
                .claimNumber(c.getClaimNumber())
                .policyId(c.getPolicyId())
                .policyNumber(c.getPolicyNumber())
                .claimType(c.getClaimType())
                .status(c.getStatus())
                .claimedAmount(c.getClaimedAmount())
                .approvedAmount(c.getApprovedAmount())
                .incidentDate(c.getIncidentDate())
                .fraudScore(c.getFraudScore())
                .filedAt(c.getFiledAt())
                .build();
    }

    private ClaimDto toDto(Claim c) {
        List<ClaimStatusHistoryDto> history = statusHistoryRepository.findByClaim_IdOrderByCreatedAtDesc(c.getId()).stream()
                .map(h -> ClaimStatusHistoryDto.builder()
                        .id(h.getId())
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .changedBy(h.getChangedBy())
                        .note(h.getNote())
                        .createdAt(h.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<ClaimDocumentDto> docs = documentRepository.findByClaim_Id(c.getId())
                .stream()
                .map(d -> ClaimDocumentDto.builder()
                        .id(d.getId())
                        .documentName(d.getDocumentName())
                        .documentType(d.getDocumentType())
                        .filePath(d.getFilePath())
                        .uploadedBy(d.getUploadedBy())
                        .createdAt(d.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ClaimDto.builder()
                .id(c.getId())
                .claimNumber(c.getClaimNumber())
                .policyId(c.getPolicyId())
                .policyNumber(c.getPolicyNumber())
                .holderId(c.getHolderId())
                .holderName(c.getHolderName())
                .claimType(c.getClaimType())
                .status(c.getStatus())
                .claimedAmount(c.getClaimedAmount())
                .approvedAmount(c.getApprovedAmount())
                .incidentDate(c.getIncidentDate())
                .description(c.getDescription())
                .fraudScore(c.getFraudScore())
                .fraudVerdict(c.getFraudVerdict())
                .fraudFactors(c.getFraudFactors())
                .assignedAdjusterId(c.getAssignedAdjusterId())
                .filedAt(c.getFiledAt())
                .resolvedAt(c.getResolvedAt())
                .createdAt(c.getCreatedAt())
                .statusHistory(history)
                .documents(docs)
                .build();
    }
}
