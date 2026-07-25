# Pulse SaaS — Tech Stack

## 1. Backend (`apps/api`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Runtime | Node.js (LTS) | TypeScript, compiled with `tsc` |
| Language | TypeScript | `strict` mode; `tsc --noEmit` for type-checking |
| Web framework | Express 4 | `app.ts` bootstraps middleware + routers |
| Auth | `jsonwebtoken`, `bcrypt`, `speakeasy` | JWT HttpOnly cookies, bcrypt (cost 12), TOTP MFA |
| Validation | `zod` | Request schemas per domain + shared validators |
| ORM / DB | Prisma + SQLite (dev) / PostgreSQL (prod) | Singleton in `shared/lib/prisma.ts` |
| Payments | Stripe SDK (`stripe`) | Webhooks + idempotent subscription sync |
| Security | `helmet`, `cors`, `express-rate-limit`, `cookie-parser` | CSP, HSTS, CORS, rate-limiting |
| Rate-limit store | `ioredis` + custom `RedisRateLimitStore` | Shared counters across replicas; fails open to in-memory |
| Config | `shared/lib/config.ts` — `requireSecret()` | Throws at boot in production if any secret is missing |
| Seed | `prisma/seed.ts` | Demo company + customers + MRR snapshots |

## 2. Frontend (`apps/web`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Bundler / dev | Vite | `vite.config.ts` |
| Framework | React 18 + TypeScript | `App.tsx`, `main.tsx` |
| Routing | React Router v6 | Only `"/"` (Dashboard) registered as an active route |
| Data fetching | TanStack React Query v5 | `shared/lib/queryClient.ts` |
| HTTP client | Axios (`shared/lib/api.ts`) | Cookie credentials; dispatches `auth:unauthorized` on 401 |
| Charts | Recharts | `MRRChart` (line), `FunnelChart` (bar), `RetentionRing` (SVG) |
| Animation | Framer Motion | Page-level and per-card entrance animations |
| UI utilities | `clsx`, `lucide-react` | Conditional class names, icon set |
| State | Server state via React Query; no global store | Local `useState` only where needed |

## 3. Tooling

| Tool | Purpose |
|------|---------| 
| `tsc` | Static type-check (`apps/api`) |
| ESLint + Prettier | Lint & format (recommended) |
| Docker / docker-compose | Container runtime + option A deployment |
| Helm | Kubernetes packaging (option B deployment) |
| Prisma CLI | `migrate dev` (local), `migrate deploy` (production) |

## 4. Environment Variables

All secrets are loaded and validated at boot via `shared/lib/config.ts`.
In production (`NODE_ENV=production`), the server will throw and refuse to start if any
**required** secret is missing.

| Variable | Required in prod | Used by | Purpose |
|----------|-----------------|---------|---------|
| `DATABASE_URL` | ✅ | Prisma | Database connection string |
| `JWT_SECRET` | ✅ | Auth | Access token signing (15 min) |
| `JWT_REFRESH_SECRET` | ✅ | Auth | Refresh token signing (7 d) |
| `COOKIE_SECRET` | ✅ | cookie-parser | Cookie signature verification |
| `STRIPE_SECRET_KEY` | ✅ | Billing | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Billing | Webhook signature verification |
| `CLIENT_ORIGIN` | ✅ | CORS | Allowed frontend origin |
| `NODE_ENV` | ✅ | All | `development` / `production` |
| `REDIS_URL` | Recommended | Rate limiter | Shared counters across API replicas |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limiter | Window size (default 60 000 ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Rate limiter | Global limit (default 100 req/win) |
| `LOGIN_RATE_LIMIT_MAX` | No | Rate limiter | Auth endpoint limit (default 10 req/win) |
| `PORT` | No | Server | Listening port (default 5000) |

## 5. Rate-Limiting Architecture

```
app.ts
  ├── global limiter  (100 req/min)  → /api/*
  └── auth limiter    (10 req/min)   → /api/auth/login, /api/auth/register

Both limiters → createRateLimitStore(prefix)
  ├── REDIS_URL set   → RedisRateLimitStore  (shared across all instances)
  └── REDIS_URL unset → MemoryStore          (per-instance, fine for single-node dev)

RedisRateLimitStore: fails OPEN
  Redis reachable  → shared counter via INCR + PEXPIRE pipeline
  Redis unreachable → falls back to in-memory Map per instance
```

## 6. Dependency Map (by domain)

| Domain | Key dependencies |
|--------|------------------|
| Auth | `jsonwebtoken`, `bcrypt` (cost 12), `speakeasy`, `zod` |
| Accounts | `zod`, Prisma `Customer` |
| Billing | `stripe`, Prisma `Subscription` / `MRRSnapshot` |
| Analytics | Prisma `Event` / `HealthScore` / `ChurnEvent` |
| Export | `zod`, Prisma `MRRSnapshot` (CSV/JSON formatting) |
| Shared | `@prisma/client`, `express`, `zod`, `ioredis`, `cookie-parser` |
