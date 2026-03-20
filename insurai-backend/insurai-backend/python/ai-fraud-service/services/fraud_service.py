from models.fraud_model import fraud_model
from schemas.fraud import FraudCheckRequest, FraudCheckResponse
from datetime import datetime, timezone


async def detect_fraud(request: FraudCheckRequest) -> FraudCheckResponse:
    claim = {
        "claimed_amount": request.claimed_amount,
        "claim_type": request.claim_type,
        "avg_claim_amount": None,
        "total_past_claims": 0,
    }
    if request.holder_claim_history:
        claim["avg_claim_amount"] = request.holder_claim_history.get(
            "avgClaimAmount"
        ) or request.holder_claim_history.get("avg_claim_amount")
        claim["total_past_claims"] = request.holder_claim_history.get(
            "totalPastClaims"
        ) or request.holder_claim_history.get("total_past_claims", 0)

    score, anomalies = fraud_model.predict(claim)
    verdict = fraud_model.get_verdict(score)

    return FraudCheckResponse(
        claim_id=request.claim_id,
        fraud_score=score,
        verdict=verdict,
        anomalies=anomalies,
        model_version="v1.0-rules",
        checked_at=datetime.now(timezone.utc),
    )
