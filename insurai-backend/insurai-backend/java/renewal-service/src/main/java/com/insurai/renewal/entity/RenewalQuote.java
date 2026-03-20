package com.insurai.renewal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "renewal_quotes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RenewalQuote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renewal_id")
    private Renewal renewal;

    @Column(name = "quoted_premium", nullable = false, precision = 15, scale = 2)
    private BigDecimal quotedPremium;

    @Column(name = "quote_valid_until", nullable = false)
    private LocalDate quoteValidUntil;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "accepted")
    private Boolean accepted;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        if (accepted == null) accepted = false;
        if (discountPercent == null) discountPercent = BigDecimal.ZERO;
    }
}
