# InsurAI – Backend Build Guide for Cursor

## What to Build (12 Services Total)

### Java Spring Boot Services (8)
| Service | Port | Key Tables |
|---------|------|------------|
| api-gateway | 8080 | (no DB) |
| auth-service | 8081 | users, roles, refresh_tokens |
| policy-service | 8082 | policies, policy_templates, policy_versions |
| workflow-service | 8083 | workflows, workflow_steps, approvals |
| rules-service | 8084 | rules, rule_executions |
| claims-service | 8085 | claims, claim_documents, claim_status_history |
| renewal-service | 8086 | renewals, renewal_quotes |
| notify-service | 8087 | notification_preferences, notification_logs |

### Python FastAPI Services (4)
| Service | Port | Model |
|---------|------|-------|
| ai-risk-service | 9001 | XGBoost risk scorer |
| ai-fraud-service | 9002 | Isolation Forest fraud detector |
| ai-document-service | 9003 | HuggingFace NLP extractor |
| ai-assistant-service | 9004 | LLM + RAG (OpenAI/Anthropic) |

---

## Tech Stack Per Service

### Java Services
- Spring Boot 3.2
- Spring Security + JWT (jjwt 0.12)
- Spring Data JPA + Hibernate
- Spring for Apache Kafka
- PostgreSQL driver
- Lombok
- MapStruct
- Flyway (DB migrations)

### Python Services
- FastAPI 0.110+
- Pydantic v2
- aiokafka (async Kafka)
- SQLAlchemy (for model metadata)
- scikit-learn / xgboost / transformers (per service)
- Redis (result caching)

### Infrastructure
- PostgreSQL 16 (one DB per Java service, separate schemas)
- Apache Kafka 3.7 + Zookeeper
- Redis 7
- Docker + Docker Compose

---

## Build Order for Cursor

Build these services in order, one at a time, following each SERVICE_SPEC.md. The AI services have working fallback logic so they run even before real ML models are trained.

1. `infra/docker-compose.yml` — start all infra
2. `auth-service` — JWT issuer, users/roles
3. `api-gateway` — JWT validation, routing
4. `policy-service` — policy CRUD + Kafka producer
5. `rules-service` — rule engine + Kafka consumer
6. `workflow-service` — approval state machine
7. `claims-service` — claims CRUD + fraud Kafka
8. `renewal-service` — scheduled renewal jobs
9. `notify-service` — event-driven notifications
10. `ai-risk-service` — Python XGBoost
11. `ai-fraud-service` — Python Isolation Forest
12. `ai-document-service` — Python NLP
13. `ai-assistant-service` — Python RAG

---

## Kafka Topics to Create

```
policy-events
risk-evaluation-requests
risk-evaluation-results
fraud-check-requests
fraud-check-results
document-analysis-requests
document-analysis-results
notification-events
audit-events
```

---

## JWT Flow

1. Client → POST /api/auth/login → auth-service issues JWT
2. All requests → API Gateway validates JWT signature
3. Gateway strips JWT, adds headers: X-User-Id, X-Roles, X-Org-Id
4. Backend services trust these headers (no re-validation)
5. Service-to-service: pass X-Internal-Token header (shared secret)
