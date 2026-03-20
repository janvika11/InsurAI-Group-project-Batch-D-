package com.insurai.renewal.service;

import com.insurai.renewal.entity.Renewal;
import com.insurai.renewal.entity.RenewalQuote;
import com.insurai.renewal.kafka.NotificationEventProducer;
import com.insurai.renewal.repository.RenewalQuoteRepository;
import com.insurai.renewal.repository.RenewalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RenewalScheduledJobs {

    private final RenewalRepository renewalRepository;
    private final RenewalQuoteRepository renewalQuoteRepository;
    private final NotificationEventProducer notificationEventProducer;

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void sendExpiryReminders() {
        log.info("Running sendExpiryReminders job");
        LocalDate now = LocalDate.now();
        LocalDate in30Days = now.plusDays(30);
        LocalDate in7Days = now.plusDays(7);

        List<Renewal> expiringIn30 = renewalRepository.findByExpiryDateBetweenAndRenewalStatus(now, in30Days, "PENDING");
        for (Renewal r : expiringIn30) {
            int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(now, r.getExpiryDate());
            notificationEventProducer.publishRenewalReminder(
                    r.getHolderId().toString(),
                    r.getHolderEmail(),
                    null,
                    r.getPolicyNumber(),
                    r.getPolicyId().toString(),
                    daysUntil
            );
            r.setLastRemindedAt(OffsetDateTime.now());
            r.setRenewalStatus("NOTIFIED");
            renewalRepository.save(r);
        }

        List<Renewal> expiringIn7 = renewalRepository.findByExpiryDateBetweenAndRenewalStatus(now, in7Days, "NOTIFIED");
        for (Renewal r : expiringIn7) {
            int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(now, r.getExpiryDate());
            notificationEventProducer.publishRenewalReminder(
                    r.getHolderId().toString(),
                    r.getHolderEmail(),
                    null,
                    r.getPolicyNumber(),
                    r.getPolicyId().toString(),
                    daysUntil
            );
            r.setLastRemindedAt(OffsetDateTime.now());
            renewalRepository.save(r);
        }

        List<Renewal> expiredPending = renewalRepository.findByExpiryDateBeforeAndRenewalStatus(now, "PENDING");
        List<Renewal> expiredNotified = renewalRepository.findByExpiryDateBeforeAndRenewalStatus(now, "NOTIFIED");
        for (Renewal r : expiredPending) {
            r.setRenewalStatus("LAPSED");
            renewalRepository.save(r);
        }
        for (Renewal r : expiredNotified) {
            r.setRenewalStatus("LAPSED");
            renewalRepository.save(r);
        }
        log.info("Completed sendExpiryReminders: 30d={}, 7d={}, expired={}", expiringIn30.size(), expiringIn7.size(), expiredPending.size() + expiredNotified.size());
    }

    @Scheduled(cron = "0 0 0 1 * *", zone = "Asia/Kolkata")
    @Transactional
    public void generateRenewalQuotes() {
        log.info("Running generateRenewalQuotes job");
        LocalDate now = LocalDate.now();
        LocalDate in60Days = now.plusDays(60);

        List<Renewal> renewals = renewalRepository.findByExpiryDateBetweenAndRenewalStatus(now, in60Days, "PENDING");
        renewals.addAll(renewalRepository.findByExpiryDateBetweenAndRenewalStatus(now, in60Days, "NOTIFIED"));

        for (Renewal r : renewals) {
            if (renewalQuoteRepository.findByRenewal_Id(r.getId()).isEmpty()) {
                RenewalQuote quote = RenewalQuote.builder()
                        .renewal(r)
                        .quotedPremium(BigDecimal.valueOf(10000))
                        .quoteValidUntil(r.getExpiryDate().plusDays(30))
                        .discountPercent(BigDecimal.valueOf(5))
                        .accepted(false)
                        .build();
                renewalQuoteRepository.save(quote);
            }
        }
        log.info("Generated renewal quotes for {} renewals", renewals.size());
    }
}
