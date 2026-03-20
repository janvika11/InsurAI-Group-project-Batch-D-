package com.insurai.renewal.kafka;

import com.insurai.renewal.entity.Renewal;
import com.insurai.renewal.repository.RenewalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PolicyEventConsumer {

    private final RenewalRepository renewalRepository;

    @KafkaListener(topics = "policy-events", groupId = "renewal-service-group")
    public void consumePolicyEvent(Map<String, Object> payload) {
        try {
            String eventType = (String) payload.get("eventType");
            String policyIdStr = (String) payload.get("policyId");
            String policyNumber = (String) payload.get("policyNumber");
            String holderIdStr = (String) payload.get("holderId");
            String holderName = (String) payload.get("holderName");

            if (policyIdStr == null || policyNumber == null || holderIdStr == null) {
                log.warn("Received policy event with missing required fields");
                return;
            }

            UUID policyId = UUID.fromString(policyIdStr);
            UUID holderId = UUID.fromString(holderIdStr);

            if ("POLICY_APPROVED".equals(eventType) || "POLICY_ACTIVE".equals(eventType)) {
                if (renewalRepository.findByPolicyId(policyId).isEmpty()) {
                    Object endDateObj = payload.get("endDate");
                    LocalDate expiryDate = endDateObj != null
                            ? LocalDate.parse(endDateObj.toString().substring(0, 10))
                            : LocalDate.now().plusYears(1);
                    Object metadataObj = payload.get("metadata");
                    String holderEmail = null;
                    if (metadataObj instanceof Map<?, ?> meta) {
                        Object email = meta.get("holderEmail");
                        if (email != null) holderEmail = email.toString();
                    }

                    Renewal renewal = Renewal.builder()
                            .policyId(policyId)
                            .policyNumber(policyNumber)
                            .holderId(holderId)
                            .holderEmail(holderEmail)
                            .expiryDate(expiryDate)
                            .renewalStatus("PENDING")
                            .build();
                    renewalRepository.save(renewal);
                    log.info("Created renewal tracking for policy {}", policyNumber);
                }
            } else if ("POLICY_EXPIRED".equals(eventType)) {
                renewalRepository.findByPolicyId(policyId).ifPresent(r -> {
                    r.setRenewalStatus("LAPSED");
                    renewalRepository.save(r);
                    log.info("Marked renewal as lapsed for policy {}", policyNumber);
                });
            }
        } catch (Exception e) {
            log.error("Error processing policy event: {}", e.getMessage());
        }
    }
}
