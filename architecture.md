# Pulse SaaS — System Architecture & Engineering Alignment

> Comprehensive technical architecture specification for the Pulse SaaS API (`apps/api`) and Web Application (`apps/web`).

---

## 1. Executive System Summary

Pulse SaaS is an enterprise-grade, multi-tenant revenue analytics engine designed for high performance, zero-cold-start queries, and strict tenant isolation. The platform aggregates customer subscription events, calculates SaaS unit economics in real time, forecasts churn using multi-signal decay models, and delivers automated dunning and executive board reporting.

---

## 2. Core Architectural Pillars

```
                                  ┌───────────────────────────┐
                                  │      Client Gateway       │
                                  │  React + TanStack Query   │
                                  └─────────────┬─────────────┘
                                                │
                                  ┌─────────────▼─────────────┐
                                  │    Express API Gateway    │
                                  │  Helmet / Cors / Auth     │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
    │     API Key Auth         │  │   JWT / MFA Middleware   │  │   Stripe Webhook Sync    │
    │  Bearer pulse_live_xxx   │  │ HttpOnly Cookie & Roles  │  │  Signature Verification  │
    └────────────┬─────────────┘  └────────────┬─────────────┘  └────────────┬─────────────┘
                 │                             │                             │
                 └─────────────────────────────┼─────────────────────────────┘
                                               │
                                  ┌────────────▼────────────┐
                                  │   In-Memory KPI Cache   │
                                  │  Warm-Up Boot Strategy  │
                                  └────────────┬────────────┘
                                               │
                                  ┌────────────▼────────────┐
                                  │    Prisma ORM Layer     │
                                  │  SQLite / PostgreSQL    │
                                  └─────────────────────────┘
```

### A. Multi-Tenant Data Isolation
Every data table in the Prisma schema enforces a `company_id` index and relation. All service layers and controller routes extract `req.companyId` from verified JWTs or API Keys, preventing cross-tenant data leakage.

### B. High-Performance Query & Caching Engine
- **Boot Cache Warm-Up**: On server startup, `warmUpCache(prisma)` pre-populates in-memory KPI snapshots 3 seconds post-boot (`kpi-cache.ts`), eliminating cold-start database load spikes.
- **O(1) & O(K) Complexity Bounds**: Aggregations use indexed group-by queries and sub-selects (`take: 1` relation ordering) rather than full table scans.

### C. Non-Blocking Event Operations
External HTTP dispatches (e.g., Slack webhook alerts) execute asynchronously (fire-and-forget) to ensure zero latency impact on Stripe webhook handlers or Express HTTP responses.

---

## 3. Backend Module Domain Architecture (`apps/api/src`)

```
apps/api/src/
├── app.ts                          # Express application entrypoint & global middleware pipeline
├── jobs/
│   └── mrr-snapshot.job.ts         # 12-hour worker job calculating MRR waterfall snapshots
└── modules/
    ├── accounts/                   # Customer CRM
    │   ├── accounts.routes.ts      # Paginated customer directory & detail lookups
    │   ├── accounts.service.ts     # Customer query builders
    │   ├── customer-notes.routes.ts# Internal team CRM notes per customer
    │   └── saved-segments.routes.ts# Custom filter preset persistence
    ├── analytics/                  # Core Business Intelligence & AI
    │   ├── analytics.service.ts    # KPIs, conversion funnel, health score, & real cohort matrix
    │   ├── health-score.service.ts # 0-100 score engine (payment, inactivity decay, trial rules)
    │   ├── health-rules.routes.ts  # Customizable health score weight configuration
    │   ├── mrr-goal.routes.ts      # Revenue targets & velocity projection engine
    │   ├── predictive-churn.service.ts # Multi-signal risk forecasting (Low, Medium, Critical)
    │   ├── kpis.routes.ts          # GET /api/kpis
    │   ├── funnel.routes.ts        # GET /api/funnel
    │   ├── health.routes.ts        # GET /api/health
    │   ├── cohorts.routes.ts       # GET /api/analytics/cohorts
    │   └── churn.routes.ts         # GET /api/churn
    ├── api-keys/                   # External Developer API Access
    │   ├── api-key.middleware.ts   # Bearer pulse_live_xxx token validator
    │   └── api-keys.routes.ts      # Key generation (SHA-256 hash) & revocation
    ├── audit/                      # Security & Operational Auditing
    │   └── audit.routes.ts         # Security log viewer & rate-limit IP lockout resets
    ├── auth/                       # Authentication & Authorization
    │   ├── auth.routes.ts          # Login, logout, refresh, password reset, team invite
    │   ├── auth.service.ts         # Hashing, token issuance, timing attack mitigation
    │   ├── auth.middleware.ts      # JWT & refresh token rotation
    │   └── rbac.middleware.ts      # Role enforcement (OWNER, ADMIN, ANALYST, DEVELOPER)
    ├── billing/                    # Revenue Integration & Dunning
    │   ├── billing.routes.ts       # MRR series endpoint
    │   ├── billing.service.ts      # Subscription upserts & MRR snapshot recording
    │   ├── dunning.routes.ts       # Past-due summary & real recovery event tracking
    │   ├── stripe.webhook.ts       # Stripe signature verification & webhook event handlers
    │   ├── stripe.client.ts        # Stripe SDK client initialization
    │   └── webhook-simulator.routes.ts # Developer simulator sandbox endpoint
    ├── export/                     # Data Interchange
    │   ├── export.routes.ts        # CSV/JSON dataset exporter
    │   └── csv-import.routes.ts    # Multi-step CSV import wizard endpoint
    ├── notifications/              # Alerts & Webhooks
    │   ├── notifications.routes.ts # In-app notifications
    │   └── slack-notifications.service.ts # Non-blocking Slack webhook dispatch
    ├── shared/                     # Cross-Cutting Infrastructure
    │   ├── lib/prisma.ts           # Prisma ORM Singleton instance
    │   ├── lib/config.ts           # Centralized environment variable validator
    │   ├── lib/kpi-cache.ts        # TTL Cache with boot warm-up engine
    │   ├── lib/email.service.ts    # Transactional email service
    │   └── lib/rateLimitStore.ts   # Memory/Redis rate limiting store
    └── vendor-billing/             # Platform Licensing & Plan Gates
        ├── plan-gate.middleware.ts # Customer account cap enforcer (HTTP 402)
        ├── vendor-billing.routes.ts# Pulse subscription management
        └── vendor-billing.webhook.ts# Vendor Stripe webhook handler
```

---

## 4. Frontend Application Architecture (`apps/web/src`)

```
apps/web/src/
├── App.tsx                         # Router configuration with protected layout wrapper
├── main.tsx                        # Application mount point
├── index.css                       # Global styling & Tailwind utilities
├── components/                     # Reusable UI Widgets & Modal Components
│   ├── AccountsTable.tsx           # Paginated table with responsive column collapse
│   ├── CohortHeatmap.tsx           # Monthly retention matrix visualization
│   ├── CommandPalette.tsx          # Keyboard-driven quick navigator (⌘K / Ctrl+K)
│   ├── CsvImportWizard.tsx         # Drag-and-drop CSV importer modal
│   ├── CustomerNotes.tsx           # Internal CRM notes feed
│   ├── CustomerTimeline.tsx        # Event timeline drawer for accounts
│   ├── ExecutiveReportModal.tsx    # Board deck PDF/HTML exporter
│   ├── FunnelChart.tsx             # Recharts conversion funnel
│   ├── HealthRuleBuilder.tsx       # Interactive health score weight editor
│   ├── HotkeyCheatSheet.tsx        # Keyboard shortcut helper
│   ├── KPICard.tsx                 # Metric card widget with MoM indicator
│   ├── MRRChart.tsx                # Recharts area chart (New, Exp, Cont, Churn)
│   ├── MrrGoalWidget.tsx           # Revenue goal progress bar & velocity meter
│   ├── NotificationBell.tsx        # Dropdown notification bell
│   ├── OnboardingBanner.tsx        # Zero-state setup guide
│   ├── PredictiveRiskWidget.tsx    # Churn risk AI account table
│   ├── RetentionRing.tsx           # SVG health distribution ring
│   ├── SegmentFilter.tsx           # Saved segment view pills & modal
│   ├── SideNav.tsx                 # Collapsible primary navigation sidebar
│   └── WebhookPlayground.tsx       # Interactive Stripe event simulator
├── hooks/
│   ├── useKpis.ts                  # TanStack Query data hooks
│   └── useTheme.tsx                # Light/Dark mode switcher
└── pages/                          # Primary Page Views
    ├── Dashboard.tsx               # Analytics overview workspace
    ├── AccountsPage.tsx            # Full customer CRM & account drawer
    ├── HealthPage.tsx              # Account health distribution & rule builder
    ├── FunnelPage.tsx              # Conversion funnel analysis
    ├── BillingPage.tsx             # Dunning recovery & revenue settings
    ├── Settings.tsx                # API keys, team management, audit logs, webhooks
    ├── DocsPage.tsx                # Interactive REST API documentation
    ├── StatusPage.tsx              # Public service status portal
    ├── LandingPage.tsx             # Marketing homepage
    ├── Login.tsx                   # Authentication & password reset UI
    └── Register.tsx                # Company bootstrap page
```

---

## 5. API Endpoint Registry

| Route Path | Method | Protection | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Bootstraps company & initial owner admin account |
| `/api/auth/login` | `POST` | Public | Issues HttpOnly JWT cookies & checks MFA requirement |
| `/api/auth/forgot-password` | `POST` | Public | Dispatches transactional password reset token link |
| `/api/auth/reset-password` | `POST` | Public | Validates reset token and sets new password hash |
| `/api/kpis` | `GET` | JWT / API Key | Returns MRR, customer count, churn rate, ARPU, LTV, Quick Ratio |
| `/api/mrr` | `GET` | JWT / API Key | Returns historical 12-period MRR waterfall series |
| `/api/analytics/predictive-churn`| `GET` | JWT / API Key | Returns multi-signal at-risk accounts & forecasted churn rate |
| `/api/analytics/cohorts` | `GET` | JWT / API Key | Computes 2-pass deterministic cohort retention matrix |
| `/api/saved-segments` | `GET/POST/DEL`| JWT / API Key | CRUD operations for custom customer filter presets |
| `/api/api-keys` | `GET/POST/DEL`| JWT (Owner/Admin)| Generates sha256-hashed scoped developer API keys |
| `/webhooks/stripe` | `POST` | Stripe Signature | Ingests live Stripe webhooks & updates subscriptions |

---

## 6. Verification & Build Integrity

All project builds pass strict TypeScript type checks and database schema validations:

```bash
# Verify API TypeScript Types
cd apps/api && npx tsc --noEmit

# Verify Web TypeScript Types
cd apps/web && npx tsc --noEmit
```
