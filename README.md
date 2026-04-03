# InsurAI

Corporate policy automation and intelligence — full-stack monorepo (Java microservices + React frontend).

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

Other useful commands:

```bash
npm run build    # production build (output in dist/)
```

---

## Quick API tests (via gateway: `http://localhost:8080`)

Use **curl**, **Postman**, or **Thunder Client**. JSON bodies use `Content-Type: application/json`.

### Register users (one-time per email)

`POST http://localhost:8080/api/auth/register`

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

If registration fails with **“Email already registered”**, skip to login or use a different email.

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

## Project layout

| Path | What it is |
|------|------------|
| `insurai-backend/insurai-backend/` | `docker-compose.yml`, Java services, Python AI services |
| `insurai-frontend/` | Vite + React UI |

---

## License

See [LICENSE](LICENSE) at the repository root.
