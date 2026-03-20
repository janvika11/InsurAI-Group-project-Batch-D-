# InsurAI – Complete API Reference

Base URL: http://localhost:8080 (via API Gateway)
Auth: All endpoints (except /api/auth/**) require: `Authorization: Bearer <jwt>`

---

## Auth Service (/api/auth/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/auth/login | ❌ | — | Login, returns JWT |
| POST | /api/auth/register | ❌ | — | Register new user |
| POST | /api/auth/refresh | ❌ | — | Refresh access token |
| POST | /api/auth/logout | ✅ | Any | Revoke refresh token |
| GET | /api/users | ✅ | ADMIN | List all users |
| POST | /api/users | ✅ | ADMIN | Create user |
| PUT | /api/users/{id}/roles | ✅ | ADMIN | Update user roles |
| GET | /api/users/{id} | ✅ | ADMIN | Get user detail |

---

## Policy Service (/api/policies/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/policies | ✅ | CUSTOMER, ADMIN | Create policy application |
| GET | /api/policies | ✅ | UNDERWRITER, ADMIN | List all policies (paginated) |
| GET | /api/policies/my | ✅ | CUSTOMER | My policies |
| GET | /api/policies/{id} | ✅ | Any | Get policy details |
| PUT | /api/policies/{id}/status | ✅ | UNDERWRITER, ADMIN | Approve/reject |
| GET | /api/policies/{id}/documents | ✅ | Any | List documents |
| POST | /api/policies/{id}/documents | ✅ | CUSTOMER, ADMIN | Upload document |
| GET | /api/policies/{id}/versions | ✅ | UNDERWRITER, ADMIN | Version history |
| GET | /api/policy-templates | ✅ | Any | List templates |
| POST | /api/policy-templates | ✅ | ADMIN | Create template |

---

## Workflow Service (/api/workflows/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | /api/workflows | ✅ | UNDERWRITER, ADMIN | List all workflows |
| GET | /api/workflows/my-queue | ✅ | UNDERWRITER | My assigned queue |
| GET | /api/workflows/{policyId} | ✅ | UNDERWRITER, ADMIN | Workflow for policy |
| PUT | /api/workflows/{id}/assign | ✅ | ADMIN | Assign underwriter |
| PUT | /api/workflows/{id}/decision | ✅ | UNDERWRITER | Approve/reject/escalate |
| GET | /api/workflows/{id}/history | ✅ | Any | Step history |

---

## Rules Service (/api/rules/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | /api/rules | ✅ | UNDERWRITER, ADMIN, AI_ANALYST | List rules |
| GET | /api/rules/{id} | ✅ | UNDERWRITER, ADMIN | Rule detail |
| POST | /api/rules | ✅ | ADMIN | Create rule |
| PUT | /api/rules/{id} | ✅ | ADMIN | Update rule |
| DELETE | /api/rules/{id} | ✅ | ADMIN | Disable rule |
| POST | /api/rules/evaluate | ✅ | ADMIN | Manual evaluate |
| GET | /api/rules/executions | ✅ | ADMIN, AI_ANALYST | Execution logs |

---

## Claims Service (/api/claims/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/claims | ✅ | CUSTOMER | File new claim (multipart) |
| GET | /api/claims | ✅ | CLAIMS_ADJUSTER, ADMIN | All claims (paginated) |
| GET | /api/claims/my | ✅ | CUSTOMER | My claims |
| GET | /api/claims/{id} | ✅ | Any | Claim details |
| PUT | /api/claims/{id}/status | ✅ | CLAIMS_ADJUSTER, ADMIN | Update status |
| POST | /api/claims/{id}/documents | ✅ | CUSTOMER, ADMIN | Add documents |
| GET | /api/claims/{id}/documents | ✅ | Any | List documents |
| GET | /api/claims/{id}/history | ✅ | Any | Status history |
| DELETE | /api/claims/{id} | ✅ | CUSTOMER | Withdraw (SUBMITTED only) |

---

## Renewal Service (/api/renewals/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | /api/renewals | ✅ | ADMIN, UNDERWRITER | All renewals |
| GET | /api/renewals/my | ✅ | CUSTOMER | My renewals |
| GET | /api/renewals/{id} | ✅ | Any | Renewal detail |
| GET | /api/renewals/{id}/quotes | ✅ | Any | Available quotes |
| POST | /api/renewals/{id}/accept-quote | ✅ | CUSTOMER | Accept renewal quote |

---

## Notification Service (/api/notifications/**)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | /api/notifications/preferences | ✅ | Any | Get my preferences |
| PUT | /api/notifications/preferences | ✅ | Any | Update preferences |
| GET | /api/notifications/logs | ✅ | ADMIN | Notification history |

---

## AI Risk Service (/api/ai/risk/**)

Routes through Gateway to ai-risk-service:9001

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/ai/risk/score | ✅ | UNDERWRITER, ADMIN, AI_ANALYST | Score a policy |
| GET | /api/ai/risk/model/info | ✅ | AI_ANALYST, ADMIN | Model metadata |
| GET | /api/ai/risk/health | ❌ | — | Health check |

---

## AI Document Service (/api/ai/documents/**)

Routes through Gateway to ai-document-service:9003

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/ai/documents/extract | ✅ | Any | Extract fields from doc |
| POST | /api/ai/documents/compare | ✅ | UNDERWRITER, ADMIN | Compare two docs |
| GET | /api/ai/documents/health | ❌ | — | Health check |

---

## AI Assistant Service (/api/ai/assistant/**)

Routes through Gateway to ai-assistant-service:9004

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/ai/assistant/chat | ✅ | Any | Chat / Q&A |
| POST | /api/ai/assistant/summarize | ✅ | Any | Summarize policy |
| GET | /api/ai/assistant/health | ❌ | — | Health check |

---

## Common Response Formats

### Success (200/201)
```json
{
  "data": { ... },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### Paginated
```json
{
  "data": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 147,
  "totalPages": 8
}
```

### Error (4xx/5xx)
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Policy POL-2025-0999 not found",
  "timestamp": "2025-03-01T09:00:00Z",
  "path": "/api/policies/POL-2025-0999"
}
```

---

## Frontend ↔ Backend Mapping

From the React frontend, here's what each portal calls:

| Portal Page | Backend Calls |
|-------------|---------------|
| Login | POST /api/auth/login |
| Customer: My Dashboard | GET /api/policies/my, GET /api/claims/my |
| Customer: Apply for Policy | POST /api/policies |
| Customer: File Claim | POST /api/claims (multipart) |
| Customer: AI Assistant | POST /api/ai/assistant/chat |
| Underwriter: Review Queue | GET /api/workflows/my-queue |
| Underwriter: Approve Policy | PUT /api/workflows/{id}/decision |
| Underwriter: Risk Analysis | GET /api/ai/risk/score (or Kafka result) |
| Claims: Open Claims | GET /api/claims?status=SUBMITTED,UNDER_REVIEW |
| Claims: Fraud Alerts | GET /api/claims?fraudVerdict=HIGH_RISK |
| Claims: AI Fraud Tool | POST /api/ai/fraud/detect (direct to service) |
| Admin: User Management | GET /api/users |
| Admin: Microservices | GET /actuator/health (each service) |
| Admin: Kafka Monitor | Kafka-UI or GET /api/admin/kafka/topics |
| Admin: Audit Logs | GET /api/audit-events (future) |
| AI Analyst: Overview | GET /api/ai/risk/health + fraud + doc + assistant |
| AI Analyst: Model Registry | GET /api/ai/risk/model/info etc. |
