# Pulse SaaS — Design

Design principles, conventions, and the planned frontend composition for the domain-based structure.

## 1. Backend Design Conventions

### Layering (per domain)
```
routes  →  service  →  prisma  →  postgres
  │           │
schema ← validation (Zod)
```
- **Routes** are thin: parse input, call a service, return JSON. No business logic inline.
- **Services** hold all domain logic (`*.service.ts`) and are the unit-testable seam.
- **Schemas** (`*.schema.ts`) declare Zod validators; shared validators live in `shared/middleware/validation.ts`.
- **Middleware** (`auth.middleware.ts`, `shared/middleware/validation.ts`) is cross-cutting.

### Auth design
- JWT access token (15 min) + refresh token (7 days) stored in **httpOnly, SameSite=Strict** cookies.
- `tokenRefreshMiddleware` silently rotates the access token on each request when expired but refresh is valid.
- MFA is TOTP (speakeasy): enroll sets `mfa_secret` (base32), confirm enables `mfa_enabled`.
- Login uses a dummy `bcrypt.compare` on failure to mitigate user enumeration (constant-ish work).

### Billing / Stripe design
- Webhook route registered with `express.raw({ type: 'application/json' })` so `req.body` is a Buffer for signature verification.
- `stripe.client.ts` exposes a single Stripe instance + `verifyWebhookSignature` / `extractCustomerId` helpers.
- Subscription sync is idempotent via `upsert` on `stripe_subscription_id`.

### Analytics design
- One `analytics.service.ts` aggregates KPIs, funnel, and health to avoid duplicating Prisma queries across three route files.
- Funnel derives counts by grouping `Event.name`; percentages are relative to `visitors` (0-safe).

## 2. Frontend Design (planned)

### Module composition
- `pages/Dashboard.tsx` is the single composition root: it imports widgets from each module and lays them out in a responsive grid.
- `modules/layout/SideNav.tsx` provides navigation between dashboard sections.

### Component inventory
| Module | Component | Data source |
|--------|-----------|-------------|
| accounts | `AccountsTable.tsx` | `GET /api/accounts` |
| billing | `MRRChart.tsx` | `GET /api/mrr` |
| analytics | `KPICard.tsx` | `GET /api/kpis` |
| analytics | `FunnelChart.tsx` | `GET /api/funnel` |
| analytics | `RetentionRing.tsx` | `GET /api/health` |
| analytics | `hooks/useKpis.ts` | React Query wrapper over `/api/kpis` |

### Data flow (frontend)
```
useKpis() → shared/lib/api.ts → GET /api/kpis (verifyJwt cookie)
         → shared/lib/queryClient.ts (React Query cache)
         → KPICard / FunnelChart / RetentionRing
```

### Shared UI contract
- `shared/lib/api.ts` — typed fetch wrapper that sends cookies (`credentials: 'include'`) and unwraps `{ data }` / `{ error }`.
- `shared/lib/queryClient.ts` — single React Query client instance.

## 3. Security & Config design
- `helmet` CSP defaults to `'self'`; HSTS enabled in production.
- Global rate limiter on `/api/*` (configurable via `RATE_LIMIT_*` env vars).
- CORS restricted to `CLIENT_ORIGIN`; cookies are `SameSite=Strict` + `secure` in prod.
- Secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) come from env / `.env`.

## 4. Naming & style conventions
- Domain folder = lowercase singular (`auth`, `accounts`, `billing`).
- Files: `*.routes.ts`, `*.service.ts`, `*.schema.ts`, `*.middleware.ts`, `*.client.ts`.
- All money = integer cents. All timestamps = UTC `Date`.
- Route handlers return `{ success }` / `{ error }` envelopes; services throw on failure.
