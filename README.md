# InsurAI

Corporate policy automation and intelligence — full-stack  (Java microservices + React frontend).

## Get the code

**Clone with Git (recommended)**

```bash
git clone https://github.com/janvika11/InsurAI.project.git
cd InsurAI.project
```

**Download ZIP**

On GitHub: **Code → Download ZIP**, extract the folder, then open a terminal inside the extracted project root.

---

## Prerequisites

- **Docker Desktop** (for backend: Kafka, Postgres, services)
- **Node.js 18+** and **npm** (for the frontend)

---

## Start the backend (API Gateway on port 8080)
**Important:** Start Docker and keep it running 

All runnable services live under the nested folder `insurai-backend/insurai-backend`.

```bash
cd insurai-backend/insurai-backend
```

Optional: copy environment template (API keys, etc.):

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Start infrastructure and services:

```bash
docker compose up -d
```

Wait until containers are healthy, then verify:

- **API Gateway:** http://localhost:8080  
- **Kafka UI:** http://localhost:8090  

More detail: see [insurai-backend/insurai-backend/README.md](insurai-backend/insurai-backend/README.md).

---

## Start the frontend (dev server on port 3000)

In a **second** terminal, from the repository root:

```bash
cd insurai-frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The Vite dev server **proxies `/api` to `http://localhost:8080`**, so the gateway must be running first for live API calls.

**Claim document uploads** are stored by **claims-service** on **server disk** (Docker volume `claims_uploads` → `/app/uploads` in the container), **not** in Amazon S3. AWS credentials in `.env` do not apply to that flow unless you change the Java code to use S3.

Other useful commands:

```bash
npm run build    # production build (output in dist/)
```

---

## Quick API tests (via gateway: `http://localhost:8080`)

Use **curl**, **Postman**, or **Thunder Client**. JSON bodies use `Content-Type: application/json`.

### Register users (one-time per email)

`POST http://localhost:8080/api/auth/register`

**Note:** If the email is **already registered**, registration will fail — try again with a **new email address**, or use **Login** below if you already created that account.

**Admin**

```json
{
  "email": "aryan@insurai.com",
  "password": "admin123",
  "fullName": "Aryan Admin",
  "role": "ADMIN"
}
```

**Customer**

```json
{
  "email": "rahul@company.com",
  "password": "customer123",
  "fullName": "Rahul Mehta",
  "role": "CUSTOMER"
}
```

**Underwriter**

```json
{
  "email": "priya@insurai.com",
  "password": "under123",
  "fullName": "Priya Sharma",
  "role": "UNDERWRITER"
}
```

**Claims adjuster**

```json
{
  "email": "vikram@insurai.com",
  "password": "claims123",
  "fullName": "Vikram Singh",
  "role": "CLAIMS_ADJUSTER"
}
```

**AI analyst**

```json
{
  "email": "neha@insuraikk.com",
  "password": "ai12345",
  "fullName": "Neha Patel",
  "role": "AI_ANALYST"
}
```

If that email is rejected by validation, use `neha@insurai.com` instead (same password and name).

---

### Login

`POST http://localhost:8080/api/auth/login`

```json
{
  "email": "rahul@company.com",
  "password": "customer123"
}
```

Save the **`accessToken`** from the response. For protected routes, send:

```http
Authorization: Bearer <accessToken>
```

---

### Create a policy (example — customer flow)

`POST http://localhost:8080/api/policies`

```json
{
  "holderName": "Rahul Mehta",
  "policyType": "CORPORATE_HEALTH",
  "coverageAmount": 5000000,
  "startDate": "2026-03-24",
  "endDate": "2027-03-24",
  "metadata": {
    "sector": "software",
    "revenue": 180000000
  }
}
```

Replace `Authorization` with the customer’s token. Note the returned **`id`** (policy id) for the next step.

---

### File a claim

`POST http://localhost:8080/api/claims`

```json
{
  "policyId": "<rahul-policy-id>",
  "claimType": "MEDICAL_EXPENSE",
  "claimedAmount": 50000,
  "incidentDate": "2026-03-24",
  "description": "Hospital admission for surgery"
}
```

Use the real **policy UUID** from `GET /api/policies` (or your create-policy response) instead of `<rahul-policy-id>`.

---

### GET examples (usually require a valid JWT)

| Resource | URL |
|----------|-----|
| Claims | `GET http://localhost:8080/api/claims` |
| Workflows | `GET http://localhost:8080/api/workflows` |
| Renewals | `GET http://localhost:8080/api/renewals` |

Example (curl):

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:8080/api/claims
```

---

### AI assistant (chat)

`POST http://localhost:8080/api/ai/assistant/chat`

```json
{
  "userId": "USR-001",
  "message": "Summarize my policy coverage"
}
```

---

### AI service health checks

| Check | URL |
|-------|-----|
| Risk service | `GET http://localhost:8080/api/ai/risk/health` |
| Assistant service | `GET http://localhost:8080/api/ai/assistant/health` |

---

## What to do in each portal (recommended order)

Log in with the matching role (or register a user with that `role`, then log in). Then use the sidebar in this order where it applies.

### Customer portal

1. **Apply for policy** — Submit a new policy application first so you have a policy (and policy id) in the system.  
2. **File a claim** — Create a claim **against an existing policy** (you need the policy id from step 1 or from **My policies**).  
3. **My claims** — Track status; use **Renewals** when a policy is due; **AI Assistant** for questions about coverage.

### Underwriter portal

1. **Review queue** — Work incoming applications first.  
2. **Risk analysis / Rules** — Check scores and rules before decisions.  
3. **Approved / Escalated** — Approve or escalate; use **Reports** for summaries.

### Claims adjuster portal

1. **Open claims** — Pick a claim and **adjudicate** (approve, reject, or send to investigation).  
2. **Fraud alerts / AI fraud tool** — Run checks on suspicious claims.  
3. **Investigation → Settlements** — Follow cases through to closure.

### Admin portal

1. **User management** — **Create users** (email, password, full name, role) so teammates can log in; edit roles if your build supports it.  
2. **Microservices / Kafka** — Confirm services are up and events are flowing.  
3. **Audit / Rules / Config** — Review logs and system rules as needed.

### AI analyst portal

1. **AI Overview** — Start with service health and throughput.  
2. **Risk / Fraud / Document / Assistant** — Drill into each AI service.  
3. **Kafka / Models / Inference logs** — Debug pipelines and model usage.

---

## Project layout

| Path | What it is |
|------|------------|
| `insurai-backend/insurai-backend/` | `docker-compose.yml`, Java services, Python AI services |
| `insurai-frontend/` | Vite + React UI |

---

## License

See [LICENSE](LICENSE) at the repository root.
