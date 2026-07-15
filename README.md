# Pulse — SaaS Analytics & Revenue Dashboard

A white-label, self-hostable analytics dashboard you can deploy **inside your client's
own infrastructure** (their VPS / Kubernetes cluster, their PostgreSQL). You own the code;
they own the data.

## Stack
- **Frontend:** React 18 + Vite + TailwindCSS + Framer Motion + TanStack Query
- **Backend:** Node.js + Express + Prisma (PostgreSQL)
- **Auth:** JWT (HttpOnly cookies) + optional TOTP MFA
- **Deploy:** Docker Compose (Option 2) or Helm/Kubernetes (Option 3)

## Repo layout
```
apps/web    -> React frontend (Vite build, nginx-served)
apps/api    -> Express API + Prisma
charts/     -> Helm chart (pulse-dashboard)
k8s/        -> raw Kubernetes manifests
docker-compose.yml -> Option 2 (no bundled DB)
```

## Quick start (local dev)

### 1. Backend
```bash
cd apps/api
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev        # creates tables
npx prisma db seed            # demo data + admin@pulse.example / changeme123
npm run dev                   # http://localhost:5000
```

### 2. Frontend
```bash
cd apps/web
cp .env.example .env          # VITE_API_URL=http://localhost:5000
npm install
npm run dev                   # http://localhost:3000
```

### 3. Login
POST `/api/auth/login` with `admin@pulse.example` / `changeme123`, or use the
register endpoint to bootstrap a new company. Tokens are set as HttpOnly cookies.

## Deploy (client-managed — Option 2)
See [DEPLOYMENT.md](./DEPLOYMENT.md). Database is the client's; point `DATABASE_URL`
at their PostgreSQL instance.

## Security
See [SECURITY.md](./SECURITY.md). Highlights: CSP/HSTS/helmet, Zod-validated input,
parameterized queries, rate limiting, signed webhooks, non-root containers, MFA-ready.

## API endpoints
| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| POST | /api/auth/logout | public |
| POST | /api/auth/mfa/enroll | admin |
| POST | /api/auth/mfa/confirm | admin |
| GET | /api/kpis | JWT |
| GET | /api/mrr | JWT |
| GET | /api/funnel | JWT |
| GET | /api/accounts | JWT |
| GET | /api/health | JWT |
| GET | /api/export | JWT |
| POST | /webhooks/stripe | Stripe signature |
