# Deploy InsurAI (frontend + backend)

## 1. Frontend on Vercel

1. Push this repo to GitHub/GitLab/Bitbucket (if it is not already).
2. In [Vercel](https://vercel.com): **Add New Project** → import the repository.
3. Set **Root Directory** to `insurai-frontend`.
4. Framework: Vite (auto-detected). Build: `npm run build`, output: `dist`.
5. **Environment variables** (Production & Preview):
   - `VITE_API_BASE_URL` = the public URL of your API gateway, **no trailing slash**  
     Example: `https://api.yourdomain.com` or `http://YOUR_SERVER_IP:8080` for a quick test.
6. Deploy. After the backend is reachable, open the Vercel URL and sign in.

**Custom domain:** Add it in Vercel → Project → Domains.  
**Backend CORS:** The API gateway allows `https://*.vercel.app`. For a custom domain like `https://app.example.com`, add that origin in `java/api-gateway/src/main/resources/application.yml` under `allowedOriginPatterns` (or deploy a small config change).

---

## 2. Backend with Docker (recommended)

The stack is defined in `insurai-backend/insurai-backend/docker-compose.yml` (Kafka, Redis, PostgreSQL instances, Java services, Python AI services).

### Requirements

- A Linux server (VPS) or your machine with **Docker** and **Docker Compose v2**.
- Open port **8080** (API gateway) to the internet if the frontend on Vercel will call it.  
  Restrict by firewall to your office IP if you want it private.

### Steps

```bash
cd insurai-backend/insurai-backend
cp .env.example .env   # create if missing — see below
docker compose build
docker compose up -d
```

Set secrets in `.env` in the same folder (used by Compose):

```env
JWT_SECRET=use-a-long-random-string-in-production
OPENAI_API_KEY=sk-...          # optional, for AI assistant
ANTHROPIC_API_KEY=             # optional
SMTP_USER=
SMTP_PASS=
```

Wait until containers are healthy, then check:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/health
```

(Use the gateway’s real health path if different.)

### Point Vercel at the backend

Set `VITE_API_BASE_URL` in Vercel to:

`http://YOUR_PUBLIC_IP:8080`  
or  
`https://api.yourdomain.com` (if you put a reverse proxy with TLS in front of port 8080).

**HTTPS:** Browsers may block mixed content if the frontend is `https://` and the API is `http://`. For production, terminate TLS with **Nginx**, **Caddy**, or **Cloudflare** in front of the gateway.

---

## 3. Order of operations

1. Deploy backend (Docker) and confirm `8080` responds from the internet (or from your network as needed).
2. Set `VITE_API_BASE_URL` on Vercel to that gateway URL.
3. Redeploy the frontend (or trigger a new build) so the env var is baked into the bundle.

---

## 4. Optional: TLS with Caddy (example)

On the server, install Caddy and proxy `https://api.example.com` → `localhost:8080`, then use `VITE_API_BASE_URL=https://api.example.com` on Vercel.

---

## 5. What this repo does not automate

- Managed databases (RDS, etc.) instead of container Postgres.
- Kubernetes manifests or cloud-specific (ECS, Cloud Run) templates.
- CI/CD pipelines; you can add GitHub Actions to build images and deploy.

For a first deployment, **Vercel (frontend) + one VPS running `docker compose`** is the simplest path.
