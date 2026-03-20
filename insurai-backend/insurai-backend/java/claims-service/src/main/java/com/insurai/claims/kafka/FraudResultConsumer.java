package com.insurai.claims.kafka;

import com.insurai.claims.entity.Claim;
import com.insurai.claims.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class FraudResultConsumer {

    private final ClaimRepository claimRepository;

    @KafkaListener(topics = "fraud-check-results", groupId = "claims-service-group")
    public void consumeFraudResult(Map<String, Object> payload) {
        try {
            String claimIdStr = (String) payload.get("claimId");
            Object fraudScoreObj = payload.get("fraudScore");
            String verdict = (String) payload.get("verdict");
            Object anomaliesObj = payload.get("anomalies");

            if (claimIdStr == null) {
                log.warn("Received fraud result without claimId");
                return;
            }

            Integer fraudScore = fraudScoreObj != null ? ((Number) fraudScoreObj).intValue() : null;
            List<String> anomalies = null;
            if (anomaliesObj instanceof List<?> list) {
                anomalies = list.stream()
                        .map(Object::toString)
                        .collect(Collectors.toList());
            }

            UUID claimId = UUID.fromString(claimIdStr);
            Claim claim = claimRepository.findById(claimId)
                    .orElseThrow(() -> new RuntimeException("Claim not found: " + claimId));

            claim.setFraudScore(fraudScore);
            claim.setFraudVerdict(verdict);
            claim.setFraudFactors(anomalies);

            if (fraudScore != null && fraudScore > 70) {
                claim.setStatus(Claim.ClaimStatus.FRAUD_REVIEW);
            } else if (fraudScore != null && fraudScore > 50) {
                claim.setStatus(Claim.ClaimStatus.INVESTIGATION);
            } else if (fraudScore != null && fraudScore <= 30) {
                claim.setStatus(Claim.ClaimStatus.UNDER_REVIEW);
            }

            claimRepository.save(claim);
            log.info("Updated claim {} with fraud score {} verdict {}", claim.getClaimNumber(), fraudScore, verdict);
        } catch (Exception e) {
            log.error("Error processing fraud result: {}", e.getMessage());
        }
    }
}
