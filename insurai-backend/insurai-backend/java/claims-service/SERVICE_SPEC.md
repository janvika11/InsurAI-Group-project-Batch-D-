# claims-service – Cursor Build Instructions

## Overview
Claims CRUD, status tracking, document uploads, publishes fraud check requests to Kafka,
consumes fraud results and updates claim scores.

## application.yml
```yaml
server:
  port: 8085

spring:
  application:
    name: claims-service
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5436/claimsdb}
    username: ${SPRING_DATASOURCE_USERNAME:insurai}
    password: ${SPRING_DATASOURCE_PASSWORD:insurai123}
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

## Database Migrations

### V1__create_claims.sql
```sql
CREATE TYPE claim_status AS ENUM (
  'SUBMITTED', 'UNDER_REVIEW', 'FRAUD_REVIEW', 'INVESTIGATION',
  'APPROVED', 'REJECTED', 'SETTLED', 'WITHDRAWN'
);

CREATE TYPE claim_type AS ENUM (
  'MEDICAL_EXPENSE', 'HOSPITALIZATION', 'ACCIDENT', 'PROPERTY_DAMAGE',
  'MARINE_DAMAGE', 'PUBLIC_LIABILITY', 'EMPLOYEE_HEALTH', 'GROUP_MEDICAL', 'OTHER'
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g. CLM-0091
  policy_id UUID NOT NULL,
  policy_number VARCHAR(50) NOT NULL,
  holder_id UUID NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  claim_type claim_type NOT NULL,
  status claim_status DEFAULT 'SUBMITTED',
  claimed_amount DECIMAL(15,2) NOT NULL,
  approved_amount DECIMAL(15,2),
  incident_date DATE NOT NULL,
  description TEXT,
  fraud_score INTEGER,                        -- from ai-fraud-service
  fraud_verdict VARCHAR(50),                  -- LOW_RISK / MEDIUM_RISK / HIGH_RISK
  fraud_factors JSONB,
  assigned_adjuster_id UUID,
  filed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  from_status claim_status,
  to_status claim_status NOT NULL,
  changed_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_holder ON claims(holder_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_number ON claims(claim_number);

CREATE SEQUENCE claim_number_seq START 100;
```

## Package Structure
```
com.insurai.claims
├── ClaimsServiceApplication.java
├── config/
│   └── KafkaConfig.java
├── controller/
│   └── ClaimController.java          # /api/claims
├── service/
│   ├── ClaimService.java
│   ├── ClaimNumberGenerator.java     # CLM-NNNN format
│   └── DocumentStorageService.java   # save files to disk/S3
├── kafka/
│   ├── FraudCheckProducer.java       # → fraud-check-requests
│   ├── FraudResultConsumer.java      # ← fraud-check-results
│   └── PolicyEventConsumer.java      # ← policy-events (validate policy exists)
├── repository/
│   ├── ClaimRepository.java
│   ├── ClaimStatusHistoryRepository.java
│   └── ClaimDocumentRepository.java
├── entity/
│   ├── Claim.java
│   ├── ClaimStatusHistory.java
│   └── ClaimDocument.java
└── dto/
    ├── FileClaim Request.java
    ├── UpdateClaimStatusRequest.java
    ├── ClaimDto.java
    └── ClaimSummaryDto.java
```

## REST API Contracts

### POST /api/claims
Multipart form data (supports file upload):
```
policyId: uuid
claimType: MEDICAL_EXPENSE
incidentDate: 2025-02-10
claimedAmount: 45000
description: Hospital admission for surgery
documents: [file1.pdf, file2.jpg] (optional)
```
Response 201:
```json
{
  "id": "uuid",
  "claimNumber": "CLM-0044",
  "status": "SUBMITTED",
  "fraudScore": null,
  "message": "Claim submitted. Fraud analysis in progress."
}
```

### GET /api/claims
Query: status, holderId, policyId, page, size
ADJUSTER/ADMIN see all. CUSTOMER sees only own.

### GET /api/claims/{id}
Full claim detail with documents and status history.

### PUT /api/claims/{id}/status
Body: `{ "status": "APPROVED", "approvedAmount": 45000, "note": "..." }`
Only CLAIMS_ADJUSTER or ADMIN.

### GET /api/claims/my
Returns claims for X-User-Id.

### POST /api/claims/{id}/documents
Upload additional documents to existing claim.

## Kafka Events Published

### → fraud-check-requests
```json
{
  "requestId": "uuid",
  "claimId": "uuid",
  "claimNumber": "CLM-0091",
  "policyId": "uuid",
  "holderId": "uuid",
  "claimType": "MARINE_DAMAGE",
  "claimedAmount": 4800000,
  "incidentDate": "2025-02-15",
  "holderClaimHistory": { "totalPastClaims": 2, "avgClaimAmount": 600000 },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### → notification-events (on status change)
```json
{
  "eventType": "CLAIM_STATUS_CHANGED",
  "recipientId": "uuid",
  "recipientEmail": "...",
  "claimNumber": "CLM-0091",
  "newStatus": "APPROVED",
  "timestamp": "..."
}
```

## Kafka Events Consumed

### ← fraud-check-results
```json
{
  "requestId": "uuid",
  "claimId": "uuid",
  "fraudScore": 87,
  "verdict": "HIGH_RISK",
  "anomalies": ["amount_spike_8x", "location_mismatch"],
  "timestamp": "..."
}
```
On receive: update claim.fraudScore, claim.fraudVerdict, change status to FRAUD_REVIEW if score > 70.

## Business Rules
- If fraudScore > 70 → auto-set status to FRAUD_REVIEW, notify adjuster
- If fraudScore > 50 → set status to INVESTIGATION
- If fraudScore ≤ 30 → keep UNDER_REVIEW, eligible for fast-track approval
- Only CLAIMS_ADJUSTER or ADMIN can approve/reject
- CUSTOMER can withdraw only SUBMITTED claims

