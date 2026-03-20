package com.insurai.renewal.service;

import com.insurai.renewal.dto.RenewalDto;
import com.insurai.renewal.dto.RenewalQuoteDto;
import com.insurai.renewal.dto.RenewalSummaryDto;
import com.insurai.renewal.entity.Renewal;
import com.insurai.renewal.entity.RenewalQuote;
import com.insurai.renewal.kafka.NotificationEventProducer;
import com.insurai.renewal.repository.RenewalQuoteRepository;
import com.insurai.renewal.repository.RenewalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RenewalService {

    private final RenewalRepository renewalRepository;
    private final RenewalQuoteRepository renewalQuoteRepository;
    private final NotificationEventProducer notificationEventProducer;

    public Page<RenewalSummaryDto> list(UUID holderId, String status, Integer expiresInDays, Pageable pageable) {
        Specification<Renewal> spec = Specification.where(null);
        if (holderId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("holderId"), holderId));
        }
        if (status != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("renewalStatus"), status));
        }
        if (expiresInDays != null) {
            java.time.LocalDate from = java.time.LocalDate.now();
            java.time.LocalDate to = from.plusDays(expiresInDays);
            spec = spec.and((root, q, cb) -> cb.between(root.get("expiryDate"), from, to));
        }
        return renewalRepository.findAll(spec, pageable).map(this::toSummaryDto);
    }

    public RenewalDto get(UUID id) {
        Renewal renewal = renewalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Renewal not found: " + id));
        return toDto(renewal);
    }

    public List<RenewalQuoteDto> getQuotes(UUID id) {
        Renewal renewal = renewalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Renewal not found: " + id));
        return renewalQuoteRepository.findByRenewal_Id(renewal.getId()).stream()
                .map(this::toQuoteDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RenewalDto acceptQuote(UUID renewalId, UUID quoteId) {
        Renewal renewal = renewalRepository.findById(renewalId)
                .orElseThrow(() -> new RuntimeException("Renewal not found: " + renewalId));
        RenewalQuote quote = renewalQuoteRepository.findById(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found: " + quoteId));
        if (!quote.getRenewal().getId().equals(renewalId)) {
            throw new RuntimeException("Quote does not belong to this renewal");
        }
        if (Boolean.TRUE.equals(quote.getAccepted())) {
            throw new RuntimeException("Quote already accepted");
        }
        if (quote.getQuoteValidUntil().isBefore(java.time.LocalDate.now())) {
            throw new RuntimeException("Quote has expired");
        }

        quote.setAccepted(true);
        renewalQuoteRepository.save(quote);
        renewal.setRenewalStatus("RENEWED");
        renewal.setRenewedAt(java.time.OffsetDateTime.now());
        renewalRepository.save(renewal);

        notificationEventProducer.publishRenewalInitiated(
                renewal.getPolicyId().toString(),
                renewal.getPolicyNumber(),
                renewal.getHolderId().toString()
        );

        return toDto(renewalRepository.findById(renewalId).orElseThrow());
    }

    private RenewalSummaryDto toSummaryDto(Renewal r) {
        return RenewalSummaryDto.builder()
                .id(r.getId())
                .policyId(r.getPolicyId())
                .policyNumber(r.getPolicyNumber())
                .holderId(r.getHolderId())
                .expiryDate(r.getExpiryDate())
                .renewalStatus(r.getRenewalStatus())
                .lastRemindedAt(r.getLastRemindedAt())
                .build();
    }

    private RenewalDto toDto(Renewal r) {
        List<RenewalQuoteDto> quotes = renewalQuoteRepository.findByRenewal_Id(r.getId()).stream()
                .map(this::toQuoteDto)
                .collect(Collectors.toList());
        return RenewalDto.builder()
                .id(r.getId())
                .policyId(r.getPolicyId())
                .policyNumber(r.getPolicyNumber())
                .holderId(r.getHolderId())
                .holderEmail(r.getHolderEmail())
                .expiryDate(r.getExpiryDate())
                .renewalStatus(r.getRenewalStatus())
                .lastRemindedAt(r.getLastRemindedAt())
                .renewedAt(r.getRenewedAt())
                .createdAt(r.getCreatedAt())
                .quotes(quotes)
                .build();
    }

    private RenewalQuoteDto toQuoteDto(RenewalQuote q) {
        return RenewalQuoteDto.builder()
                .id(q.getId())
                .quotedPremium(q.getQuotedPremium())
                .quoteValidUntil(q.getQuoteValidUntil())
                .discountPercent(q.getDiscountPercent())
                .accepted(q.getAccepted())
                .createdAt(q.getCreatedAt())
                .build();
    }
}
