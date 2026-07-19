# Pulse SaaS — Tech Stack

## 1. Backend (`apps/api`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Runtime | Node.js (LTS) | ES modules / TypeScript |
| Language | TypeScript | `strict` mode; `tsc --noEmit` for type-checking |
| Web framework | Express 4 | `app.ts` bootstraps middleware + routers |
| Auth | `jsonwebtoken`, `bcrypt`, `speakeasy` | JWT cookies, password hashing, TOTP MFA |
| Validation | `zod` | Request schemas per domain + shared validators |
| ORM / DB | Prisma + PostgreSQL | `prisma` singleton in `shared/lib/prisma.ts` |
| Payments | Stripe SDK (`stripe`) | Webhooks + subscription sync |
| Security | `helmet`, `cors`, `express-rate-limit`, `cookie-parser` | CSP, HSTS, CORS, throttling |
| Testing (planned) | `vitest` / `jest` | Mirrors `modules/` 1:1 |
| Seed | `prisma/seed.ts` | Demo company + customers + snapshots |
| Config | `shared/lib/config.ts` | Centralized, validated env config (fail-fast in prod) |

## 2. Frontend (`apps/web`) — planned

| Concern | Technology | Notes |
|---------|-----------|-------|
| Bundler / dev | Vite | `apps/web/vite.config.ts` |
| Framework | React + TypeScript | `App.tsx`, `main.tsx` |
| Data fetching | React Query (`@tanstack/react-query`) | `shared/lib/queryClient.ts` |
| HTTP client | `shared/lib/api.ts` | Typed fetch wrapper, cookie credentials |
| Charts | Recharts / visx (TBD) | `MRRChart`, `FunnelChart`, `RetentionRing` |
| State | Server state via React Query; local only where needed | No global store required yet |

## 3. Tooling & Infra (planned)

| Tool | Purpose |
|------|---------|
| `tsc` | Static type-check (`apps/api`) |
| ESLint + Prettier | Lint & format (recommended) |
| Docker | API container (recommended) |
| CI (GitHub Actions) | Run `tsc --noEmit` + tests on PR |
| Postgres | Primary datastore (local or managed) |

## 4. Environment Variables

| Var | Used by | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | Prisma | Postgres connection |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth | Token signing |
| `STRIPE_SECRET_KEY` | Billing | Stripe API auth |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signature verify |
| `CLIENT_ORIGIN` | CORS | Allowed frontend origin |
| `COOKIE_SECRET` | cookie-parser | Cookie signing |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | Rate limiter | Throttle tuning |
| `NODE_ENV` | All | `development` / `production` |

## 5. Dependency Map (by domain)

| Domain | Key dependencies |
|--------|------------------|
| Auth | `jsonwebtoken`, `bcrypt`, `speakeasy`, `zod` |
| Accounts | `zod`, Prisma `Customer` |
| Billing | `stripe`, Prisma `Subscription` / `MRRSnapshot` |
| Analytics | Prisma `Event` / `HealthScore` / `ChurnEvent` |
| Export | `zod` (CSV/JSON formatting) |
| Shared | `@prisma/client`, `express`, `zod` |
