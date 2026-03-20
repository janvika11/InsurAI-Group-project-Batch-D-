# policy-service – Cursor Build Instructions

## Overview
Core policy CRUD. Creates policies, manages templates/versions, publishes Kafka events,
calls rules-service for eligibility checks, triggers AI risk scoring.

## pom.xml dependencies
Same as auth-service minus JWT, plus:
```xml
<dependency><groupId>org.springframework.kafka</groupId><artifactId>spring-kafka</artifactId></dependency>
<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
<dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-starter-openfeign</artifactId></dependency>
```

## application.yml
```yaml
server:
  port: 8082

spring:
  application:
    name: policy-service
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5433/policydb}
    username: ${SPRING_DATASOURCE_USERNAME:insurai}
    password: ${SPRING_DATASOURCE_PASSWORD:insurai123}
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true

kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
  consumer:
    group-id: policy-service-group

rules-service:
  url: ${RULES_SERVICE_URL:http://localhost:8084}
```

## Database Migrations

### V1__create_policies.sql
```sql
CREATE TYPE policy_status AS ENUM (
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CANCELLED'
);

CREATE TYPE policy_type AS ENUM (
  'CORPORATE_HEALTH', 'GROUP_LIFE', 'TERM_LIFE', 'VEHICLE',
  'FIRE_HAZARD', 'MARINE_CARGO', 'CYBER_RISK', 'PUBLIC_LIABILITY', 'HOME'
);

CREATE TABLE policy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  policy_type policy_type NOT NULL,
  template_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g. POL-2025-0839
  holder_id UUID NOT NULL,                     -- userId from auth-service
  holder_name VARCHAR(255) NOT NULL,
  org_id UUID,
  policy_type policy_type NOT NULL,
  status policy_status DEFAULT 'DRAFT',
  premium_amount DECIMAL(15,2),
  coverage_amount DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  risk_score INTEGER,                          -- filled by ai-risk-service
  ai_recommendation VARCHAR(50),               -- APPROVE / MANUAL_REVIEW / ESCALATE
  template_id UUID REFERENCES policy_templates(id),
  metadata JSONB,                              -- custom fields per policy type
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,                     -- full policy snapshot at this version
  changed_by UUID NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(500),
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_holder ON policies(holder_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_number ON policies(policy_number);

-- Generate policy numbers trigger
CREATE SEQUENCE policy_number_seq START 100;
```

## Package Structure
```
com.insurai.policy
├── PolicyServiceApplication.java
├── config/
│   ├── KafkaConfig.java
│   └── FeignConfig.java
├── controller/
│   ├── PolicyController.java        # /api/policies
│   └── PolicyTemplateController.java # /api/policy-templates
├── service/
│   ├── PolicyService.java
│   ├── PolicyNumberGenerator.java   # POL-YYYY-NNNN format
│   └── RulesServiceClient.java      # Feign client
├── kafka/
│   ├── PolicyEventProducer.java     # publishes to policy-events, risk-evaluation-requests
│   └── RiskResultConsumer.java      # consumes risk-evaluation-results, updates policy
├── repository/
│   ├── PolicyRepository.java
│   ├── PolicyTemplateRepository.java
│   └── PolicyVersionRepository.java
├── entity/
│   ├── Policy.java
│   ├── PolicyTemplate.java
│   └── PolicyVersion.java
└── dto/
    ├── CreatePolicyRequest.java
    ├── UpdatePolicyRequest.java
    ├── PolicyDto.java
    └── PolicySummaryDto.java
```

## REST API Contracts

### POST /api/policies
Headers: X-User-Id, X-Roles (from Gateway)
Request:
```json
{
  "holderName": "Nexova Systems",
  "policyType": "FIRE_HAZARD",
  "coverageAmount": 25000000,
  "startDate": "2025-04-01",
  "endDate": "2026-03-31",
  "metadata": { "sector": "manufacturing", "revenue": 180000000, "employees": 450 }
}
```
Response 201:
```json
{
  "id": "uuid",
  "policyNumber": "POL-2025-0839",
  "status": "PENDING_REVIEW",
  "riskScore": null,
  "message": "Policy created. Risk scoring in progress."
}
```

### GET /api/policies
Query params: status, holderId, policyType, page, size, sort
Returns paginated list.

### GET /api/policies/{id}
Full policy details.

### PUT /api/policies/{id}/status
Body: `{ "status": "APPROVED", "reason": "..." }`
Only UNDERWRITER or ADMIN can call this.

### GET /api/policies/my
Returns policies for current user (uses X-User-Id header).

### GET /api/policies/{id}/documents
List all documents for policy.

## Kafka Events Published

### → policy-events
```json
{
  "eventId": "uuid",
  "eventType": "POLICY_CREATED | POLICY_APPROVED | POLICY_REJECTED | POLICY_EXPIRED",
  "policyId": "uuid",
  "policyNumber": "POL-2025-0839",
  "holderId": "uuid",
  "holderName": "Nexova Systems",
  "policyType": "FIRE_HAZARD",
  "status": "PENDING_REVIEW",
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### → risk-evaluation-requests
```json
{
  "requestId": "uuid",
  "policyId": "uuid",
  "policyNumber": "POL-2025-0839",
  "policyType": "FIRE_HAZARD",
  "features": {
    "sector": "manufacturing",
    "revenue": 180000000,
    "employees": 450,
    "coverageAmount": 25000000
  },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

## Kafka Events Consumed

### ← risk-evaluation-results
```json
{
  "requestId": "uuid",
  "policyId": "uuid",
  "riskScore": 67,
  "label": "MEDIUM",
  "recommendation": "MANUAL_REVIEW",
  "factors": ["occupancy_index", "revenue_to_coverage_ratio"],
  "timestamp": "2025-03-01T09:00:05Z"
}
```
On receive: update policy.riskScore and policy.aiRecommendation, change status to PENDING_REVIEW.

## Role-based Access
- CUSTOMER: can create policy (own), view own policies
- UNDERWRITER: can view all, update status (approve/reject)
- ADMIN: full access
- Claims/AI: read-only
