"""
Rule-based fraud detection model. No trained models required.
"""

AMOUNT_THRESHOLDS = {
    "MEDICAL_EXPENSE": 500000,
    "MARINE_DAMAGE": 1000000,
    "PUBLIC_LIABILITY": 2000000,
    "VEHICLE": 500000,
}


class FraudModel:
    """
    Rule-based fraud detection. Returns fraud_score 0-100 and anomalies.
    """

    def predict(self, claim: dict) -> tuple[int, list[str]]:
        anomalies = []
        score = 10

        avg = claim.get("avg_claim_amount") or claim.get("avgClaimAmount") or 0
        amount = claim.get("claimed_amount", 0)

        if avg > 0 and amount > avg * 5:
            ratio = round(amount / avg)
            anomalies.append(f"amount_spike_{ratio}x")
            score += 40

        total_past = claim.get("total_past_claims") or claim.get("totalPastClaims") or 0
        if total_past == 0 and amount > 1000000:
            anomalies.append("first_large_claim")
            score += 20

        if total_past > 5:
            anomalies.append("high_claim_frequency")
            score += 15

        claim_type = (claim.get("claim_type") or "").upper()
        threshold = AMOUNT_THRESHOLDS.get(claim_type, 500000)
        if amount > threshold * 2:
            anomalies.append("amount_exceeds_type_threshold")
            score += 15

        return min(score, 100), anomalies

    def get_verdict(self, score: int) -> str:
        if score < 30:
            return "LOW_RISK"
        if score < 60:
            return "MEDIUM_RISK"
        return "HIGH_RISK"


fraud_model = FraudModel()
