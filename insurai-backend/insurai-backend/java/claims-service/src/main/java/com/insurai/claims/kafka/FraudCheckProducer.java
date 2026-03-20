package com.insurai.claims.kafka;

import com.insurai.claims.entity.Claim;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class FraudCheckProducer {

    private static final String FRAUD_CHECK_REQUESTS_TOPIC = "fraud-check-requests";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishFraudCheckRequest(Claim claim, Map<String, Object> holderClaimHistory) {
        String requestId = UUID.randomUUID().toString();
        Map<String, Object> request = Map.of(
                "requestId", requestId,
                "claimId", claim.getId().toString(),
                "claimNumber", claim.getClaimNumber(),
                "policyId", claim.getPolicyId().toString(),
                "holderId", claim.getHolderId().toString(),
                "claimType", claim.getClaimType().name(),
                "claimedAmount", claim.getClaimedAmount().doubleValue(),
                "incidentDate", claim.getIncidentDate().toString(),
                "holderClaimHistory", holderClaimHistory != null ? holderClaimHistory : Map.of(),
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send(FRAUD_CHECK_REQUESTS_TOPIC, requestId, request);
        log.info("Published fraud check request for claim {}", claim.getClaimNumber());
    }
}
