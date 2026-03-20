from models.risk_model import risk_model
from schemas.risk import RiskScoreRequest, RiskScoreResponse
from datetime import datetime, timezone


async def score_risk(request: RiskScoreRequest) -> RiskScoreResponse:
    features = request.features.model_dump()
    score, factors = risk_model.predict(request.policy_type, features)
    label, recommendation = risk_model.get_recommendation(score)

    return RiskScoreResponse(
        policy_id=request.policy_id,
        risk_score=score,
        label=label,
        recommendation=recommendation,
        factors=factors,
        model_version="v1.0-rules",
        scored_at=datetime.now(timezone.utc),
    )
