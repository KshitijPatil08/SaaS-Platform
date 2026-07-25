# Pulse SaaS — System Architecture

> Domain-based structure for the Pulse SaaS backend (`apps/api/src`) and frontend (`apps/web/src`).

## 1. What the project does today

**Fully implemented**
- Authenticate admin users (email + password, JWT in HttpOnly cookies, refresh-token rotation, optional TOTP MFA).
- Bootstrap a company + first admin via `/api/auth/register`.
- List & filter customer accounts (paginated, searchable by name/email, filter by status/plan). Search is debounced 300 ms in the frontend.
- Track MRR over time via `MRRSnapshot` and serve a 12-point MRR series.
- Receive Stripe webhooks to keep `Subscription` records in sync (create/update/delete, mark customer active on paid invoice).
- Compute analytics: KPIs (MRR, customer count, rolling-30-day churn rate), conversion funnel, customer health scores + at-risk accounts.
- Export MRR snapshots as CSV or JSON.
- React dashboard with live data: KPI cards (real MoM % from MRR series), MRR chart (real MoM deltas), funnel chart, retention ring (real customer counts), accounts table.

**Known gaps / not-yet-built**
- No automated test suite (test files removed; modules are the testable seam).
- SideNav links for Funnel, Health Ring, Recent Accounts, and Churn Risk exist in the UI but their dedicated page routes are not yet registered — only Dashboard (`/`) is active.
- Health-score values are computed externally — the API only reads `HealthScore` rows.
- No notifications, team-management, or multi-tenant admin features.
- No CI pipeline or Dockerfile for the API image.

## 2. Domains

| Domain | Owns (models) | Files |
|--------|---------------|-------|
| **Auth** | `AdminUser`, `Company` | `auth.routes`, `auth.service`, `auth.middleware`, `auth.schema` |
| **Accounts** | `Customer` | `accounts.routes`, `accounts.service`, `accounts.schema` |
| **Billing** | `Subscription`, `MRRSnapshot`, Stripe sync | `billing.routes`, `billing.service`, `stripe.webhook`, `stripe.client` |
| **Analytics** | `Event`, `HealthScore`, `ChurnEvent` | `kpis.routes`, `funnel.routes`, `health.routes`, `analytics.service` |
| **Export** | (reads Billing data) | `export.routes`, `export.schema` |
| **Shared** | (cross-domain) | `lib/prisma`, `lib/config`, `lib/rateLimitStore`, `middleware/validation`, `types/speakeasy` |

## 3. Backend structure (`apps/api/src`)

```
apps/api/src/
├── app.ts                          # Express bootstrap — security middleware, routers
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts          # login, logout, refresh, MFA enroll/confirm, register
│   │   ├── auth.service.ts         # bcrypt hashing, JWT issuance, TOTP, dummy-hash timing mitigation
│   │   ├── auth.middleware.ts      # verifyJwt, tokenRefreshMiddleware
│   │   └── auth.schema.ts          # Zod: loginSchema, registerSchema, mfa*
│   ├── accounts/
│   │   ├── accounts.routes.ts      # GET /api/accounts (paginated/filterable)
│   │   ├── accounts.service.ts     # query building, pagination logic
│   │   └── accounts.schema.ts      # accountsQuerySchema
│   ├── billing/
│   │   ├── billing.routes.ts       # GET /api/mrr
│   │   ├── billing.service.ts      # MRR series aggregation + subscription sync
│   │   ├── stripe.webhook.ts       # POST /webhooks/stripe
│   │   └── stripe.client.ts        # Stripe SDK instance + helpers
│   ├── analytics/
│   │   ├── kpis.routes.ts          # GET /api/kpis
│   │   ├── funnel.routes.ts        # GET /api/funnel
│   │   ├── health.routes.ts        # GET /api/health
│   │   └── analytics.service.ts    # shared aggregation (KPIs, funnel, health)
│   ├── export/
│   │   ├── export.routes.ts        # GET /api/export
│   │   └── export.schema.ts        # exportQuerySchema, CSV helpers
│   └── shared/
│       ├── lib/config.ts           # Centralized env config — requireSecret() fails fast in prod
│       ├── lib/prisma.ts           # Prisma client singleton (globalThis in dev)
│       ├── lib/rateLimitStore.ts   # Redis-backed rate-limit store; fails open to in-memory
│       ├── middleware/validation.ts # validateQuery + generic Zod schemas
│       └── types/speakeasy.d.ts
└── prisma/                         # Cross-domain by nature; schema.prisma + migrations
```

## 4. Frontend structure (`apps/web/src`)

```
apps/web/src/
├── App.tsx                         # Router + QueryClientProvider; only "/" route active
├── main.tsx
├── globals.css
├── pages/
│   └── Dashboard.tsx               # Composition root; imports all widgets
├── components/
│   ├── KPICard.tsx                 # MRR, Customers, Churn, Health — real MoM % computed
│   ├── MRRChart.tsx                # Recharts line chart — real MoM deltas, not hardcoded
│   ├── FunnelChart.tsx             # Conversion funnel (visitors → paid)
│   ├── RetentionRing.tsx           # SVG ring — real retained/churned counts from totalCustomers prop
│   ├── AccountsTable.tsx           # Paginated accounts + 300ms debounced search
│   └── SideNav.tsx                 # Only active route (Dashboard) shown; dead links removed
├── hooks/
│   └── useKpis.ts                  # React Query hooks: useKpis, useMrrSeries, useHealth, useFunnel, useAccounts
└── lib/
    ├── api.ts                      # Axios instance; dispatches auth:unauthorized on 401
    └── queryClient.ts              # Shared React Query client
```

## 5. Request flow

```
Client → app.ts (helmet → rate-limit → cors → cookieParser(config.cookieSecret))
       → tokenRefreshMiddleware (silently rotates access token if expired)
       → /api/auth/*        (public)
       → /api/{kpis,mrr,funnel,accounts,health,export}  (verifyJwt)
       → /webhooks/stripe   (raw Buffer → signature check → handler)
       → module router → module service → Prisma → Postgres / SQLite
```

## 6. Bugs fixed

| # | Bug | Fix | File(s) |
|---|-----|-----|---------|
| 1 | Stripe webhook never matched — router path mismatch | Handler now `POST /`; mounted at `/webhooks/stripe` | `stripe.webhook.ts`, `app.ts` |
| 2 | `express.json()` pre-parsed webhook body; signature verification broke | `express.raw()` mounted before `express.json()` for `/webhooks/stripe` | `app.ts` |
| 3 | Dummy bcrypt hash `'$2b$10$dummy'` was invalid → 500 on "user not found" | Precomputed valid hash; compare is safe on all paths | `auth.service.ts` |
| 4 | `tokenRefreshMiddleware` returned 401 on stale refresh cookie, blocking public routes | Clears cookies and calls `next()` on failure; auth enforced downstream by `verifyJwt` | `auth.middleware.ts` |
| 5 | `getHealth` did one `findFirst` per customer (N+1) | Single `findMany` + in-memory dedupe to latest-per-customer | `analytics.service.ts` |
| 6 | Insecure secret fallbacks used silently in production | Centralized `config.ts` with `requireSecret()` — throws at boot if missing in prod | `config.ts` |
| 7 | No brute-force protection on login/register | Dedicated `authLimiter` (10 req/win) on login + register endpoints | `app.ts` |
| 8 | `COOKIE_SECRET` bypassed `requireSecret()` and `config.ts` entirely; app read `process.env.COOKIE_SECRET` directly | `COOKIE_SECRET` now goes through `requireSecret()`; `app.ts` reads `config.cookieSecret` | `config.ts`, `app.ts` |
| 9 | `MRRSnapshot @@unique([date])` — two companies on the same date would conflict | Changed to `@@unique([company_id, date])` | `schema.prisma` |
| 10 | Churn rate used all-time event count, inflating rate for long-running companies | Scoped to rolling 30-day window via `churned_at: { gte: periodStart }` | `analytics.service.ts` |
| 11 | Dashboard KPI trend %s hardcoded (12.8, 8.2) | Computed from real MRR series via `pctChange()` | `Dashboard.tsx` |
| 12 | `RetentionRing` customer counts derived from magic number 18.24 | Now uses `totalCustomers` prop — real count from `useKpis()` | `RetentionRing.tsx`, `Dashboard.tsx` |
| 13 | `healthPct \|\| 87` silently showed fake 87% when real value was 0 or undefined | Explicit empty-state guard renders "No health data yet" instead | `Dashboard.tsx` |
| 14 | MRRChart hardcoded "+4.6%" and "+2.1%" text | Computed from actual series `data.at(-1)` vs `data.at(-2)` | `MRRChart.tsx` |
| 15 | SideNav had 4 dead links to routes not registered in App.tsx | Dead links removed; only Dashboard (`/`) shown until pages are built | `SideNav.tsx` |
| 16 | Account search fired an API request on every keystroke | Added `useDebouncedValue` hook (300 ms) | `AccountsTable.tsx` |
