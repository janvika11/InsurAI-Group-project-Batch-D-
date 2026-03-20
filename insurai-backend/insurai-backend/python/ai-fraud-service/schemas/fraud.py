from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FraudCheckRequest(BaseModel):
    claim_id: str
    claim_number: Optional[str] = None
    policy_id: str
    holder_id: str
    claim_type: str
    claimed_amount: float
    incident_date: str
    holder_claim_history: Optional[dict] = None  # {totalPastClaims, avgClaimAmount}


class FraudCheckResponse(BaseModel):
    claim_id: str
    fraud_score: int  # 0-100
    verdict: str  # LOW_RISK / MEDIUM_RISK / HIGH_RISK
    anomalies: List[str]  # ["amount_spike_8x", "location_mismatch"]
    model_version: str
    checked_at: datetime


class KafkaFraudRequest(FraudCheckRequest):
    request_id: str
    timestamp: datetime


class KafkaFraudResult(FraudCheckResponse):
    request_id: str
