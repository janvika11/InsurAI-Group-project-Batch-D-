package com.insurai.renewal.controller;

import com.insurai.renewal.dto.RenewalDto;
import com.insurai.renewal.dto.RenewalQuoteDto;
import com.insurai.renewal.dto.RenewalSummaryDto;
import com.insurai.renewal.service.RenewalService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/renewals")
@RequiredArgsConstructor
public class RenewalController {

    private final RenewalService renewalService;

    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Page<RenewalSummaryDto> getMy(Authentication auth, Pageable pageable) {
        UUID holderId = UUID.fromString(auth.getName());
        Pageable p = pageable.getSort().isSorted() ? pageable : PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), Sort.by("expiryDate").ascending());
        return renewalService.list(holderId, null, null, p);
    }

    @GetMapping
    public Page<RenewalSummaryDto> list(
            @RequestParam(required = false) UUID holderId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer expiresInDays,
            Pageable pageable) {
        return renewalService.list(holderId, status, expiresInDays, pageable);
    }

    @GetMapping("/{id}")
    public RenewalDto get(@PathVariable UUID id) {
        return renewalService.get(id);
    }

    @GetMapping("/{id}/quotes")
    public List<RenewalQuoteDto> getQuotes(@PathVariable UUID id) {
        return renewalService.getQuotes(id);
    }

    @PostMapping("/{id}/accept-quote")
    public RenewalDto acceptQuote(@PathVariable UUID id, @RequestParam("quoteId") UUID quoteId) {
        return renewalService.acceptQuote(id, quoteId);
    }
}
