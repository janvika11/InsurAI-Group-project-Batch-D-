# Python AI Services – Cursor Build Instructions

All Python services use: FastAPI 0.110+, Pydantic v2, aiokafka, uvicorn

---

# ai-risk-service (:9001)

## requirements.txt
```
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
aiokafka==0.10.0
scikit-learn==1.4.1
xgboost==2.0.3
pandas==2.2.1
numpy==1.26.4
joblib==1.3.2
redis==5.0.3
python-dotenv==1.0.1
```

## Project Structure
```
ai-risk-service/
├── main.py
├── config.py
├── models/
│   ├── risk_model.py           # XGBoost model wrapper
│   └── trained/
│       └── risk_model_v2.pkl   # serialized model (joblib)
├── routers/
│   └── risk.py                 # REST endpoints
├── kafka/
│   ├── consumer.py             # consumes risk-evaluation-requests
│   └── producer.py             # publishes risk-evaluation-results
├── schemas/
│   └── risk.py                 # Pydantic models
└── services/
    └── risk_service.py         # business logic
```

## main.py
```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from kafka.consumer import start_consumer
from routers import risk
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Kafka consumer on startup
    task = asyncio.create_task(start_consumer())
    yield
    task.cancel()

app = FastAPI(title="InsurAI Risk Service", version="1.0.0", lifespan=lifespan)
app.include_router(risk.router, prefix="/api/risk")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-risk-service"}
```

## schemas/risk.py
```python
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
    risk_score: int                      # 0-100
    label: str                           # LOW / MEDIUM / HIGH
    recommendation: str                  # APPROVE / MANUAL_REVIEW / ESCALATE
    factors: List[str]                   # contributing factors
    model_version: str
    scored_at: datetime

class KafkaRiskRequest(RiskScoreRequest):
    request_id: str
    timestamp: datetime

class KafkaRiskResult(RiskScoreResponse):
    request_id: str
```

## models/risk_model.py
```python
import numpy as np
import joblib
import os
from pathlib import Path

class RiskModel:
    """
    XGBoost classifier that predicts risk score 0-100.
    
    Features used:
    - policy_type (encoded)
    - sector (encoded)  
    - coverage_amount
    - revenue (if corporate)
    - employees
    - coverage_to_revenue_ratio (engineered)
    
    If no trained model exists, use RuleBasedFallback.
    """
    
    MODEL_PATH = Path(__file__).parent / "trained" / "risk_model_v2.pkl"
    
    POLICY_TYPE_RISK_BASE = {
        "MARINE_CARGO": 70,
        "CYBER_RISK": 65,
        "FIRE_HAZARD": 60,
        "PUBLIC_LIABILITY": 55,
        "VEHICLE": 45,
        "GROUP_LIFE": 40,
        "CORPORATE_HEALTH": 35,
        "GROUP_HEALTH": 30,
        "TERM_LIFE": 25,
        "HOME": 30,
    }
    
    def __init__(self):
        if self.MODEL_PATH.exists():
            self.model = joblib.load(self.MODEL_PATH)
            self.use_ml = True
        else:
            self.use_ml = False

    def predict(self, policy_type: str, features: dict) -> tuple[int, list[str]]:
        """Returns (risk_score 0-100, [contributing factors])"""
        if self.use_ml:
            return self._ml_predict(policy_type, features)
        return self._rule_predict(policy_type, features)

    def _rule_predict(self, policy_type: str, features: dict) -> tuple[int, list[str]]:
        base = self.POLICY_TYPE_RISK_BASE.get(policy_type.upper(), 50)
        factors = []
        score = base
        
        coverage = features.get("coverage_amount", 0)
        revenue = features.get("revenue", 1)
        
        if coverage > 0 and revenue > 0:
            ratio = coverage / revenue
            if ratio > 0.5:
                score += 15
                factors.append("high_coverage_to_revenue_ratio")
        
        if features.get("employees", 0) > 1000:
            score += 5
            factors.append("large_workforce")
        
        return min(max(int(score), 0), 100), factors

    def get_recommendation(self, score: int) -> tuple[str, str]:
        if score < 40:
            return "LOW", "APPROVE"
        elif score < 70:
            return "MEDIUM", "MANUAL_REVIEW"
        else:
            return "HIGH", "ESCALATE"

risk_model = RiskModel()
```

## services/risk_service.py
```python
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
        model_version="v2.1-xgboost" if risk_model.use_ml else "v1.0-rules",
        scored_at=datetime.now(timezone.utc)
    )
```

## routers/risk.py
```python
# POST /api/risk/score  — sync REST endpoint
# GET  /api/risk/history/{policy_id}  — scoring history from Redis
```

## kafka/consumer.py
```python
# Consumes: risk-evaluation-requests
# For each message: call score_risk(), publish result to risk-evaluation-results
```

## REST Endpoints
```
POST /api/risk/score        — score a single policy (sync, returns RiskScoreResponse)
GET  /api/risk/health       — health check
GET  /api/risk/model/info   — model version, accuracy metrics
```

---

# ai-fraud-service (:9002)

## requirements.txt
```
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
aiokafka==0.10.0
scikit-learn==1.4.1
pandas==2.2.1
numpy==1.26.4
joblib==1.3.2
redis==5.0.3
python-dotenv==1.0.1
```

## Project Structure
```
ai-fraud-service/
├── main.py
├── models/
│   └── fraud_model.py          # Isolation Forest wrapper
├── routers/
│   └── fraud.py
├── kafka/
│   ├── consumer.py             # consumes fraud-check-requests
│   └── producer.py             # publishes fraud-check-results
├── schemas/
│   └── fraud.py
└── services/
    └── fraud_service.py
```

## schemas/fraud.py
```python
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
    fraud_score: int                   # 0-100
    verdict: str                       # LOW_RISK / MEDIUM_RISK / HIGH_RISK
    anomalies: List[str]               # ["amount_spike_8x", "location_mismatch"]
    model_version: str
    checked_at: datetime
```

## models/fraud_model.py
```python
class FraudModel:
    """
    Isolation Forest anomaly detection.
    
    Features:
    - claimed_amount
    - amount_vs_avg_ratio (claimed / historical average)
    - days_since_policy_start
    - claim_frequency (total past claims)
    - claim_type (encoded)
    
    Anomaly score from Isolation Forest → mapped to 0-100 fraud score.
    
    If no trained model, use RuleBasedFraudDetector.
    """
    
    AMOUNT_THRESHOLDS = {
        "MEDICAL_EXPENSE": 500000,
        "MARINE_DAMAGE": 1000000,
        "PUBLIC_LIABILITY": 2000000,
        "VEHICLE": 500000,
    }
    
    def predict(self, claim: dict) -> tuple[int, list[str]]:
        # Rule-based fallback:
        anomalies = []
        score = 10
        
        avg = claim.get("avg_claim_amount", 0)
        amount = claim.get("claimed_amount", 0)
        
        if avg > 0 and amount > avg * 5:
            ratio = round(amount / avg)
            anomalies.append(f"amount_spike_{ratio}x")
            score += 40
        
        if claim.get("total_past_claims", 0) == 0 and amount > 1000000:
            anomalies.append("first_large_claim")
            score += 20
        
        freq = claim.get("total_past_claims", 0)
        if freq > 5:
            anomalies.append("high_claim_frequency")
            score += 15
        
        return min(score, 100), anomalies
    
    def get_verdict(self, score: int) -> str:
        if score < 30: return "LOW_RISK"
        if score < 60: return "MEDIUM_RISK"
        return "HIGH_RISK"
```

## REST Endpoints
```
POST /api/fraud/detect          — check single claim (sync)
GET  /api/fraud/health
GET  /api/fraud/model/info
```

---

# ai-document-service (:9003)

## requirements.txt
```
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
aiokafka==0.10.0
transformers==4.39.3
torch==2.2.1
python-multipart==0.0.9
pypdf2==3.0.1
pillow==10.2.0
python-dotenv==1.0.1
```

## REST Endpoints
```
POST /api/documents/extract         — upload PDF/image, extract key fields
POST /api/documents/compare         — compare two policy documents
GET  /api/documents/health
```

## POST /api/documents/extract
Multipart: `file` (PDF or image)
Response:
```json
{
  "document_type": "POLICY_DOCUMENT",
  "extracted_fields": {
    "policy_number": "POL-2025-0839",
    "holder_name": "Nexova Systems",
    "coverage_amount": 25000000,
    "start_date": "2025-04-01",
    "end_date": "2026-03-31"
  },
  "confidence_scores": { "policy_number": 0.98, "holder_name": 0.95 },
  "raw_text": "..."
}
```

## Implementation Notes
- Use PyPDF2 for PDF text extraction
- Use HuggingFace `bert-base-uncased` for NER on extracted text
- Fallback: regex patterns for common fields (dates, amounts, policy numbers)
- Cache results in Redis by file hash

---

# ai-assistant-service (:9004)

## requirements.txt
```
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.4
aiokafka==0.10.0
openai==1.14.3
chromadb==0.4.24
langchain==0.1.13
langchain-openai==0.0.8
redis==5.0.3
python-dotenv==1.0.1
```

## REST Endpoints
```
POST /api/assistant/chat            — Q&A with RAG
POST /api/assistant/summarize       — summarize a policy
GET  /api/assistant/health
```

## POST /api/assistant/chat
```json
Request:  { "userId": "uuid", "message": "What is my coverage limit?", "conversationId": "uuid" }
Response: { "reply": "Your Family Health policy POL-2025-0303 has a coverage limit of ₹25 Lakh...", "sources": ["POL-2025-0303"] }
```

## Implementation
```python
# RAG pipeline:
# 1. Embed user query (OpenAI text-embedding-3-small)
# 2. Query ChromaDB vector store for relevant policy chunks
# 3. Build prompt with retrieved context
# 4. Call OpenAI GPT-4o (or Anthropic claude-sonnet)
# 5. Return answer

# ChromaDB collection: "policies"
# Documents: policy JSON + documents, indexed by policyId
# Re-index on POLICY_APPROVED event from Kafka
```

## config.py (shared pattern for all services)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    kafka_bootstrap_servers: str = "localhost:9092"
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Dockerfile (same pattern for all Python services)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 9001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
```
(change port per service: 9001, 9002, 9003, 9004)
