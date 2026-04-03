# InsurAI Backend

Corporate Policy Automation & Intelligence System — Backend Services

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env
# Edit .env with your API keys

# 2. Start all infrastructure + services
docker-compose up -d

# 3. Access services
# API Gateway:  http://localhost:8080
# Kafka UI:     http://localhost:8090
# Auth Service: http://localhost:8081

# 4. Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@insurai.com","password":"admin123"}'
```

## Repository Structure
```
insurai-backend/
├── docker-compose.yml              # All 12 services + infra
├── .env.example                    # Environment variables template
├── _BUILD_GUIDE.md                 # Build order for Cursor
│
├── java/
│   ├── JAVA_BOILERPLATE.md         # Shared code snippets (copy to each service)
│   ├── api-gateway/
│   │   └── SERVICE_SPEC.md         # Full spec: routes, JWT filter, CORS
│   ├── auth-service/
│   │   └── SERVICE_SPEC.md         # JWT, users, roles, DB migrations
│   ├── policy-service/
│   │   └── SERVICE_SPEC.md         # Policy CRUD, Kafka events, risk scoring
│   ├── workflow-service/
│   │   └── SERVICE_SPECS.md (in other-services/)
│   ├── rules-service/
│   ├── claims-service/
│   │   └── SERVICE_SPEC.md         # Claims, fraud check, documents
│   ├── renewal-service/
│   └── notify-service/
│
├── python/
│   └── AI_SERVICES_SPEC.md         # All 4 AI services (risk, fraud, document, assistant)
│
└── docs/
    ├── KAFKA_SCHEMAS.md             # All Kafka topics + event JSON schemas
    └── API_REFERENCE.md             # Complete REST API reference + frontend mapping
```

## Service Ports
| Service | Port | Language |
|---------|------|----------|
| api-gateway | 8080 | Java |
| auth-service | 8081 | Java |
| policy-service | 8082 | Java |
| workflow-service | 8083 | Java |
| rules-service | 8084 | Java |
| claims-service | 8085 | Java |
| renewal-service | 8086 | Java |
| notify-service | 8087 | Java |
| ai-risk-service | 9001 | Python |
| ai-fraud-service | 9002 | Python |
| ai-document-service | 9003 | Python |
| ai-assistant-service | 9004 | Python |
| Kafka UI | 8090 | — |
| PostgreSQL (auth) | 15432 (host) → 5432 in container | — |
| PostgreSQL (policy) | 5433 | — |
| PostgreSQL (workflow) | 5434 | — |
| PostgreSQL (rules) | 5435 | — |
| PostgreSQL (claims) | 5436 | — |
| PostgreSQL (renewal) | 5437 | — |

## Default Credentials
- Admin login: `admin@insurai.com` / `admin123`
- All PostgreSQL: `insurai` / `insurai123`

## Cursor Instructions
Open `_BUILD_GUIDE.md` first. Then build services in order:
1. docker-compose.yml (already provided)
2. auth-service (use `java/auth-service/SERVICE_SPEC.md`)
3. api-gateway (use `java/api-gateway/SERVICE_SPEC.md`)
4. policy-service → claims-service → rest of Java services
5. Python AI services (use `python/AI_SERVICES_SPEC.md`)

Use `java/JAVA_BOILERPLATE.md` for shared code (exception handler, security config, Dockerfile).
Use `docs/KAFKA_SCHEMAS.md` for all Kafka message formats.
Use `docs/API_REFERENCE.md` for REST contracts.

## License

This project is released under the [MIT License](../../LICENSE) (repository root).
