from fastapi import APIRouter
from schemas.risk import RiskScoreRequest, RiskScoreResponse
from services.risk_service import score_risk

router = APIRouter()


@router.post("/score", response_model=RiskScoreResponse)
async def post_score(request: RiskScoreRequest):
    return await score_risk(request)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ai-risk-service"}


@router.get("/model/info")
async def model_info():
    return {
        "model_version": "v1.0-rules",
        "model_type": "rule-based",
        "description": "Policy-type risk base with coverage/revenue ratio and workforce rules",
    }
