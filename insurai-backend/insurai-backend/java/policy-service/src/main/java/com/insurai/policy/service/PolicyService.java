package com.insurai.policy.service;

import com.insurai.policy.dto.*;
import com.insurai.policy.entity.Policy;
import com.insurai.policy.kafka.PolicyEventProducer;
import com.insurai.policy.repository.PolicyDocumentRepository;
import com.insurai.policy.repository.PolicyRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PolicyService {

    private final PolicyRepository policyRepository;
    private final PolicyDocumentRepository policyDocumentRepository;
    private final PolicyNumberGenerator policyNumberGenerator;
    private final PolicyEventProducer policyEventProducer;
    private final RulesServiceClient rulesServiceClient;

    @Transactional
    public CreatePolicyResponse create(CreatePolicyRequest request, UUID userId, UUID holderId) {
        // eligibility check skipped

        String policyNumber = policyNumberGenerator.generate();
        BigDecimal premiumAmount = calculateInitialPremium(request.getPolicyType(), request.getCoverageAmount());
        Policy policy = Policy.builder()
                .policyNumber(policyNumber)
                .holderId(holderId)
                .holderName(request.getHolderName())
                .policyType(request.getPolicyType())
                .status(Policy.PolicyStatus.DRAFT)
                .premiumAmount(premiumAmount)
                .coverageAmount(request.getCoverageAmount())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .metadata(request.getMetadata())
                .createdBy(userId)
                .build();

        policy = policyRepository.save(policy);

        policyEventProducer.publishPolicyEvent(
                "POLICY_CREATED",
                policy.getId().toString(),
                policy.getPolicyNumber(),
                policy.getHolderId().toString(),
                policy.getHolderName(),
                policy.getPolicyType().name(),
                policy.getStatus().name(),
                policy.getMetadata()
        );

        Map<String, Object> features = buildRiskFeatures(request);
        policyEventProducer.publishRiskEvaluationRequest(
                policy.getId().toString(),
                policy.getPolicyNumber(),
                policy.getPolicyType().name(),
                features
        );

        return CreatePolicyResponse.builder()
                .id(policy.getId())
                .policyNumber(policy.getPolicyNumber())
                .status(Policy.PolicyStatus.PENDING_REVIEW)
                .riskScore(null)
                .message("Policy created. Risk scoring in progress.")
                .build();
    }

    public Page<PolicySummaryDto> list(Policy.PolicyStatus status, UUID holderId,
                                      Policy.PolicyType policyType, Pageable pageable) {
        Specification<Policy> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (holderId != null) {
                predicates.add(cb.equal(root.get("holderId"), holderId));
            }
            if (policyType != null) {
                predicates.add(cb.equal(root.get("policyType"), policyType));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        return policyRepository.findAll(spec, pageable).map(this::toSummaryDto);
    }

    public PolicyDto get(UUID id) {
        Policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Policy not found: " + id));
        return toDto(policy);
    }

    public Page<PolicySummaryDto> getMy(UUID holderId, Pageable pageable) {
        return policyRepository.findByHolderId(holderId, pageable).map(this::toSummaryDto);
    }

    @Transactional
    public PolicyDto updateStatus(UUID id, UpdateStatusRequest request) {
        Policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Policy not found: " + id));
        policy.setStatus(request.getStatus());
        policy = policyRepository.save(policy);

        String eventType = switch (request.getStatus()) {
            case APPROVED, ACTIVE -> "POLICY_APPROVED";
            case REJECTED -> "POLICY_REJECTED";
            case EXPIRED -> "POLICY_EXPIRED";
            case CANCELLED -> "POLICY_CANCELLED";
            default -> "POLICY_CREATED";
        };
        policyEventProducer.publishPolicyEvent(
                eventType,
                policy.getId().toString(),
                policy.getPolicyNumber(),
                policy.getHolderId().toString(),
                policy.getHolderName(),
                policy.getPolicyType().name(),
                policy.getStatus().name(),
                policy.getMetadata()
        );

        return toDto(policy);
    }

    public List<PolicyDocumentDto> getDocuments(UUID policyId) {
        return policyDocumentRepository.findByPolicyId(policyId).stream()
                .map(doc -> PolicyDocumentDto.builder()
                        .id(doc.getId())
                        .documentName(doc.getDocumentName())
                        .documentType(doc.getDocumentType())
                        .filePath(doc.getFilePath())
                        .createdAt(doc.getCreatedAt())
                        .build())
                .toList();
    }

    private Map<String, Object> buildRiskFeatures(CreatePolicyRequest request) {
        Map<String, Object> features = new HashMap<>();
        if (request.getMetadata() != null) {
            features.putAll(request.getMetadata());
        }
        if (request.getCoverageAmount() != null) {
            features.put("coverage_amount", request.getCoverageAmount().doubleValue());
        }
        return features;
    }

    private BigDecimal calculateInitialPremium(Policy.PolicyType policyType, BigDecimal coverageAmount) {
        if (coverageAmount == null || coverageAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal baseRate = switch (policyType) {
            case VEHICLE -> new BigDecimal("0.020");
            case CORPORATE_HEALTH -> new BigDecimal("0.022");
            case TERM_LIFE, GROUP_LIFE -> new BigDecimal("0.018");
            case FIRE_HAZARD, MARINE_CARGO, CYBER_RISK, PUBLIC_LIABILITY -> new BigDecimal("0.025");
            case HOME -> new BigDecimal("0.015");
        };
        return coverageAmount.multiply(baseRate).setScale(2, RoundingMode.HALF_UP);
    }

    private PolicyDto toDto(Policy policy) {
        return PolicyDto.builder()
                .id(policy.getId())
                .policyNumber(policy.getPolicyNumber())
                .holderId(policy.getHolderId())
                .holderName(policy.getHolderName())
                .orgId(policy.getOrgId())
                .policyType(policy.getPolicyType())
                .status(policy.getStatus())
                .premiumAmount(policy.getPremiumAmount())
                .coverageAmount(policy.getCoverageAmount())
                .startDate(policy.getStartDate())
                .endDate(policy.getEndDate())
                .riskScore(policy.getRiskScore())
                .aiRecommendation(policy.getAiRecommendation())
                .templateId(policy.getTemplateId())
                .metadata(policy.getMetadata())
                .createdBy(policy.getCreatedBy())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }

    private PolicySummaryDto toSummaryDto(Policy policy) {
        return PolicySummaryDto.builder()
                .id(policy.getId())
                .policyNumber(policy.getPolicyNumber())
                .holderName(policy.getHolderName())
                .policyType(policy.getPolicyType())
                .status(policy.getStatus())
                .premiumAmount(policy.getPremiumAmount())
                .coverageAmount(policy.getCoverageAmount())
                .startDate(policy.getStartDate())
                .endDate(policy.getEndDate())
                .riskScore(policy.getRiskScore())
                .build();
    }
}

