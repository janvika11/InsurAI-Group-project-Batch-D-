# InsurAI Frontend

Corporate Policy Automation & Intelligence System — React UI

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build
```

## Features

- **Login** — Role-based login (Customer, Underwriter, Claims Adjuster, Admin, AI Analyst)
- **Customer Portal** — Dashboard, policies, claims, AI assistant, renewals, documents
- **Underwriter Portal** — Review queue, risk analysis, rules engine, approvals
- **Claims Portal** — Open claims, fraud alerts, AI fraud tool, settlements
- **Admin Portal** — User management, microservices, Kafka monitor, audit logs
- **AI Analyst Portal** — AI service metrics, model registry, inference logs

## API Proxy

The dev server proxies `/api` to `http://localhost:8080` (API Gateway). Start the backend with `docker-compose up -d` in `insurai-backend/` first.

## Demo Mode

The app runs in demo mode with mock data. No backend required for UI exploration.
