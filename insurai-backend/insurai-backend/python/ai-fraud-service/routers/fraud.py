from fastapi import APIRouter
from schemas.fraud import FraudCheckRequest, FraudCheckResponse
from services.fraud_service import detect_fraud

router = APIRouter()


@router.post("/detect", response_model=FraudCheckResponse)
async def post_detect(request: FraudCheckRequest):
    return await detect_fraud(request)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ai-fraud-service"}


@router.get("/model/info")
async def model_info():
    return {
        "model_version": "v1.0-rules",
        "model_type": "rule-based",
        "description": "Amount spike, first large claim, claim frequency rules",
    }
