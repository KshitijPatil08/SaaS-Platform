# Pulse SaaS — System Architecture

> Domain-based restructuring of the Pulse SaaS backend (`apps/api/src`) and frontend (`apps/web/src`).

## 1. Problem Statement (what the project can / cannot do today)

**Can do**
- Authenticate admin users (email + password, JWT in httpOnly cookies, refresh-token rotation, optional TOTP MFA).
- Bootstrap a company + first admin via `/api/auth/register`.
- List & filter customer accounts (paginated, searchable by name/email, filter by status/plan).
- Track MRR over time via `MRRSnapshot` and serve a 12-point MRR series.
- Receive Stripe webhooks to keep `Subscription` records in sync (create/update/delete, mark customer active on paid invoice).
- Compute analytics: KPIs (MRR, customer count, churn rate), conversion funnel, customer health scores + at-risk accounts.
- Export MRR snapshots as CSV or JSON.

**Cannot do (gaps / not-yet-built)**
- No unit/integration test suite (no `*.test.ts` mirroring modules).
- No frontend is wired to these endpoints yet (only `apps/web` scaffold exists).
- No notifications, team-management, or multi-tenant admin features.
- Health-score values are computed externally — the API only reads `HealthScore` rows.
- No rate-limit / auth tests, no CI, no Dockerfile for the API.

## 2. Domains Identified

| Domain | Owns (models) | Files |
|--------|---------------|-------|
| **Auth** | `AdminUser`, `Company` | `auth.routes`, `auth.service`, `auth.middleware`, `auth.schema` |
| **Accounts** | `Customer` | `accounts.routes`, `accounts.service`, `accounts.schema` |
| **Billing** | `Subscription`, `MRRSnapshot`, Stripe sync | `billing.routes`, `billing.service`, `stripe.webhook`, `stripe.client` |
| **Analytics** | `Event`, `HealthScore`, `ChurnEvent` | `kpis.routes`, `funnel.routes`, `health.routes`, `analytics.service` |
| **Export** | (reads Billing data) | `export.routes`, `export.schema` |
| **Shared** | (cross-domain) | `lib/prisma`, `middleware/validation`, `types/speakeasy` |

Rule of thumb: a file lives in a domain folder if it only touches that domain's models; anything used by 2+ domains (Prisma client, generic validators) lives in `shared/`.

## 3. Backend Structure (`apps/api/src`)

```
apps/api/src/
├── app.ts                      # Express bootstrap, mounts module routers
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts      # login, refresh, MFA enroll/verify, register
│   │   ├── auth.service.ts     # bcrypt hashing, JWT issuance, speakeasy TOTP
│   │   ├── auth.middleware.ts  # verifyJwt, tokenRefreshMiddleware
│   │   └── auth.schema.ts      # Zod: loginSchema, registerSchema, mfa*
│   ├── accounts/
│   │   ├── accounts.routes.ts  # GET /api/accounts (paginated/filterable)
│   │   ├── accounts.service.ts # query building, pagination logic
│   │   └── accounts.schema.ts  # accountsQuerySchema
│   ├── billing/
│   │   ├── billing.routes.ts   # GET /api/mrr
│   │   ├── billing.service.ts  # MRR aggregation + subscription sync
│   │   ├── stripe.webhook.ts   # POST /webhooks/stripe
│   │   └── stripe.client.ts    # Stripe SDK instance + helpers
│   ├── analytics/
│   │   ├── kpis.routes.ts      # GET /api/kpis
│   │   ├── funnel.routes.ts    # GET /api/funnel
│   │   ├── health.routes.ts    # GET /api/health
│   │   └── analytics.service.ts# shared aggregation helpers
│   ├── export/
│   │   ├── export.routes.ts    # GET /api/export
│   │   └── export.schema.ts    # exportQuerySchema, CSV helpers
│   └── shared/
│       ├── lib/prisma.ts       # Prisma client singleton
│       ├── middleware/validation.ts # validateQuery + generic schemas
│       └── types/speakeasy.d.ts
└── prisma/                     # unchanged — schema is cross-domain by nature
```

## 4. Frontend Structure (`apps/web/src`)

```
apps/web/src/
├── App.tsx / main.tsx
├── modules/
│   ├── accounts/  AccountsTable.tsx
│   ├── billing/   MRRChart.tsx
│   ├── analytics/ FunnelChart.tsx, KPICard.tsx, RetentionRing.tsx, hooks/useKpis.ts
│   └── layout/    SideNav.tsx
├── pages/         Dashboard.tsx   # composes widgets from each module
└── shared/        lib/{api.ts, queryClient.ts}
```

## 5. Why Domain-Based Here
- **Onboarding** — a new dev opens one folder per business capability.
- **Testing** — tests mirror `modules/` 1:1 (`modules/billing/billing.test.ts`).
- **Change isolation** — a Stripe API bump only touches `modules/billing/`.
- **Scalability** — new domains (notifications, team-management) are self-contained folders.

## 6. Request Flow
```
Client → app.ts (helmet, cors, rate-limit, cookieParser)
       → tokenRefreshMiddleware (refresh access token)
       → /api/auth/* (public router)
       → /api/{kpis,mrr,funnel,accounts,health,export} (verifyJwt)
       → /webhooks/stripe (raw body, signature-verified)
       → module router → module service → Prisma → Postgres
```

## 7. Migration Notes
- Structural refactor only — **no schema or API contract changes** → low-risk.
- Move files first, update imports, run `tsc --noEmit` before touching runtime.
- Keep `prisma/` at the root of `apps/api` (intentionally cross-domain).
- Run a QA regression pass: confirm every endpoint returns identical responses after the move.
