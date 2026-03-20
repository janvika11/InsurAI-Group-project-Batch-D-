from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RiskFeatures(BaseModel):
    sector: Optional[str] = None
    revenue: Optional[float] = None
    employees: Optional[int] = None
    coverage_amount: Optional[float] = None
    policy_type: Optional[str] = None
    age: Optional[int] = None
    years_in_business: Optional[int] = None


class RiskScoreRequest(BaseModel):
    policy_id: str
    policy_number: Optional[str] = None
    policy_type: str
    features: RiskFeatures


class RiskScoreResponse(BaseModel):
    policy_id: str
    risk_score: int  # 0-100
    label: str  # LOW / MEDIUM / HIGH
    recommendation: str  # APPROVE / MANUAL_REVIEW / ESCALATE
    factors: List[str]  # contributing factors
    model_version: str
    scored_at: datetime


class KafkaRiskRequest(RiskScoreRequest):
    request_id: str
    timestamp: datetime


class KafkaRiskResult(RiskScoreResponse):
    request_id: str
