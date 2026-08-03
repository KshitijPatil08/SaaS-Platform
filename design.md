# 🎨 Pulse SaaS — Architecture & Design Specifications

Software design patterns, module layering, security conventions, and component composition for the Pulse SaaS platform.

---

## 1. Backend Layering & Conventions (`apps/api`)

### Layer Architecture (Domain Scoped)
```
HTTP Request  ──►  Middleware (CORS, Helmet, RateLimit, API Key / JWT)
                      │
                      ▼
               Zod Validation (validateQuery / validateBody)
                      │
                      ▼
               Route Handlers (modules/*/routes.ts)
                      │
                      ▼
               Service Layer (modules/*/service.ts)
                      │
                      ▼
               Prisma ORM Layer (shared/lib/prisma.ts)
                      │
                      ▼
               PostgreSQL / SQLite Database
```

- **Routes (`*.routes.ts`)**: HTTP controller layer. Parses input, invokes domain services, returns structured JSON `{ success, ... }` or error `{ error }`.
- **Services (`*.service.ts`)**: Pure domain logic seam (KPI calculations, multi-signal predictive risk scoring, dunning tracking, email dispatches).
- **Schemas (`*.schema.ts`)**: Zod schema definitions enforcing strictly typed request bodies and query parameters.
- **Middleware (`auth.middleware.ts`, `rbac.middleware.ts`, `api-key.middleware.ts`)**: Cross-cutting request authentication, RBAC authorization, and token checks.

---

## 2. Core Backend Technical Patterns

### A. Authentication & Session Rotation
- **JWT Dual Token Pattern**: 15-minute access tokens and 7-day refresh tokens stored in `HttpOnly, Secure, SameSite=Strict` cookies.
- **Silent Refresh Middleware**: `tokenRefreshMiddleware` automatically rotates access tokens on incoming requests when expired, avoiding client interruptions.
- **Constant-Time CPU Work**: Login executes a dummy `bcrypt.compare` on "user not found" paths (`consumeCpu()`), preventing timing enumeration attacks.
- **TOTP MFA**: Integrated 2FA enrollment & validation using `speakeasy` base32 TOTP secrets.

### B. High-Performance Caching & Boot Warm-Up
- **In-Memory TTL Cache (`kpi-cache.ts`)**: Fast key-value cache preventing redundant database aggregation queries.
- **Boot Warm-Up Engine (`warmUpCache`)**: Pre-populates KPI data 3 seconds after server boot, eliminating the cold-start DB load spike on deployments.

### C. Developer API & Scoped Bearer Auth
- **SHA-256 Hashed Keys**: API keys generated as `pulse_live_<hex>`, stored as SHA-256 hashes (`hashed_key`).
- **Global Bearer Middleware (`api-key.middleware.ts`)**: Validates `Authorization: Bearer pulse_live_xxx` tokens before JWT checks, setting `req.companyId` transparently for external developers.

### D. Async Non-Blocking Slack Notifications
- **Fire-and-Forget Dispatches**: Slack HTTP webhooks execute asynchronously without `await`, ensuring third-party API latency (200–2000ms) never blocks Stripe webhooks or HTTP response threads.

---

## 3. Frontend Architecture & Page Composition (`apps/web`)

### React Router Page Map (`App.tsx`)
11 registered page views providing complete navigation across all SaaS features:

| Path | Page Component | Description |
| :--- | :--- | :--- |
| `/` | `Dashboard.tsx` | Main executive overview workspace |
| `/accounts` | `AccountsPage.tsx` | Customer CRM directory, drawer, notes, & saved segments |
| `/health` | `HealthPage.tsx` | Account health distribution & interactive rule builder |
| `/funnel` | `FunnelPage.tsx` | Conversion funnel visualization & conversion metrics |
| `/billing` | `BillingPage.tsx` | Dunning recovery center & dunning settings |
| `/settings` | `Settings.tsx` | API keys, team management, security audit logs, webhooks |
| `/docs` | `DocsPage.tsx` | Interactive REST API documentation & curl generator |
| `/status` | `StatusPage.tsx` | Operational uptime status portal |
| `/landing` | `LandingPage.tsx` | Marketing homepage |
| `/login` | `Login.tsx` | Sign-in, 2FA prompt, & forgot password UI |
| `/register` | `Register.tsx` | Company bootstrap & initial admin registration |

---

## 4. Component Inventory & Data Flow

```
TanStack Query Hooks (useKpis, useAccounts, useHealth, useMrrSeries)
                              │
                              ▼
                   Axios Client (lib/api.ts)
                              │
                              ▼
            Composition Root (Dashboard.tsx / AccountsPage.tsx)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐        ┌───────────┐        ┌───────────┐
   │  MRR      │        │ Predictive│        │ Segment   │
   │  Chart    │        │  Widget   │        │ Filter    │
   └───────────┘        └───────────┘        └───────────┘
```

| Component | Responsibility | Key Feature |
| :--- | :--- | :--- |
| `KPICard.tsx` | Metric summary card | Calculates real MoM % indicators from MRR series |
| `MRRChart.tsx` | Recharts revenue chart | 5-component waterfall (New, Expansion, Contraction, Churned) |
| `CohortHeatmap.tsx` | Monthly retention matrix | 2-pass deterministic O(N) retention calculation |
| `PredictiveRiskWidget.tsx` | Churn AI risk table | Displays at-risk accounts with CS action playbooks |
| `MrrGoalWidget.tsx` | Revenue target meter | Visual progress bar with velocity forecasting |
| `AccountsTable.tsx` | Customer directory table | Paginated with 300ms debounced search & responsive collapse |
| `CustomerTimeline.tsx` | Customer drawer | Slide-over drawer showing customer activity event logs |
| `CustomerNotes.tsx` | CRM team notes | In-context note editor per customer |
| `SegmentFilter.tsx` | Saved segment presets | Save and delete custom filter view pills |
| `WebhookPlayground.tsx` | Developer simulator | Interactive Stripe webhook event simulator sandbox |
| `CsvImportWizard.tsx` | CSV data importer | Drag-and-drop CSV importer modal with column auto-mapping |
| `ExecutiveReportModal.tsx` | Board deck exporter | Generates print-ready HTML/PDF executive updates |
| `CommandPalette.tsx` | Quick navigator | Keyboard-driven navigation modal (`⌘K` / `Ctrl+K`) |
