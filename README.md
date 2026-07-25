# Pulse — SaaS Analytics & Revenue Dashboard

A white-label, self-hostable analytics dashboard you can deploy **inside your client's
own infrastructure** (their VPS / Kubernetes cluster, their PostgreSQL). You own the code;
they own the data.

## Stack
- **Frontend:** React 18 + Vite + TailwindCSS + Framer Motion + TanStack Query + Recharts
- **Backend:** Node.js + Express + Prisma (SQLite in dev / PostgreSQL in production)
- **Auth:** JWT (HttpOnly cookies) + optional TOTP MFA + shared Redis rate-limiting
- **Deploy:** Docker Compose (Option A) or Helm/Kubernetes (Option B)

## Repo layout
```
apps/web    → React frontend (Vite build, nginx-served)
apps/api    → Express API + Prisma
charts/     → Helm chart (pulse-dashboard)
k8s/        → raw Kubernetes manifests
docker-compose.yml → Option A (no bundled DB)
```

## Quick start (local dev)

### 1. Backend
```bash
cd apps/api
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, COOKIE_SECRET, etc.
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

## Deploy
See [DEPLOYMENT.md](./DEPLOYMENT.md). Point `DATABASE_URL` at your PostgreSQL instance
and set all required secrets (see the security checklist in DEPLOYMENT.md).

## Security
See [SECURITY.md](./SECURITY.md). Highlights: CSP/HSTS/helmet, Zod-validated input,
parameterized queries, rate limiting (Redis-backed, shared across instances), signed
webhooks, non-root containers, MFA-ready, fail-fast secret validation at boot.

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

## Key behaviours
- **Churn rate** is computed over a **rolling 30-day window** (not all-time).
- **MRRSnapshot** unique constraint is `(company_id, date)` — safe for multi-tenant use.
- All secrets validated at boot via `shared/lib/config.ts`; missing secrets throw in production.
- `COOKIE_SECRET` is enforced through the same `requireSecret()` path as JWT/Stripe secrets.
- Account search is debounced (300 ms) in the frontend — no per-keystroke API calls.
- Dashboard trend percentages are computed from real MRR series data, not hardcoded.
