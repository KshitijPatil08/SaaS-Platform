# ⚡ Pulse — Enterprise SaaS Revenue Analytics & Intelligence Platform

Pulse is a white-label, self-hostable, multi-tenant SaaS intelligence engine and executive analytics platform. Built for founders, Customer Success teams, and finance executives to track Monthly Recurring Revenue (MRR), cohort retention, predictive churn AI, automated dunning recovery, and subscription health in real time.

---

## 🚀 Key Features & Enterprise Capabilities

### 📊 Revenue & Financial Analytics
- **Real-Time MRR Waterfall**: 5-component revenue tracking — Total MRR, New MRR, Expansion MRR (upgrades), Contraction MRR (downgrades), and Churned MRR.
- **SaaS Unit Economics**: Automatic computation of ARPU (Average Revenue Per User), LTV (Lifetime Value), 30-Day Rolling Churn Rate, and Quick Ratio efficiency scores.
- **MRR Target Goal Tracker**: Set monthly/quarterly revenue targets with dynamic velocity forecasting and visual progress meters.
- **Multi-Currency Ready**: Native support for cents normalization and flexible currency formatting.

### 🔮 Predictive Churn AI & Health Engine
- **Deterministic Health Scoring**: Real-time 0–100 account health scores evaluated across payment status, activity decay velocity, and trial lifecycle.
- **Customizable Health Rule Builder**: Interactive rule builder allowing teams to customize signal weights (inactivity penalties, past-due impact, trial urgency).
- **Predictive Churn AI**: Multi-signal risk forecast engine classifying at-risk accounts into Low, Medium, and Critical Risk horizons with recommended CS action playbooks.

### 👥 Customer CRM & Account Intelligence
- **Interactive Customer Directory**: Paginated, searchable (debounced 300ms), and filterable customer table with status, plan, MRR, and health badges.
- **Customer Drawer & Timeline**: Deep-dive slide-over drawer showing customer activity history, plan details, payment status, and lifetime events.
- **Customer CRM Notes**: In-context internal notes log per customer for Customer Success collaboration.
- **Saved Customer Segments**: Save, list, and switch custom customer filter presets (e.g., "VIP Enterprise Trialing", "High Risk").

### ⚡ Developer Sandbox & Automation
- **Stripe Webhook Simulator**: Developer sandbox inside `Settings > Webhooks & API` to simulate `customer.subscription.created`, `invoice.payment_failed`, and `customer.subscription.deleted` events without live Stripe keys.
- **Scoped API Keys**: Secure sha256-hashed API key generator (`pulse_live_xxx`) with custom scopes and global `apiKeyMiddleware` bearer auth.
- **Slack & Transactional Email Notifications**: Real-time Slack alert dispatches for new subscriptions & churn events, plus transactional email password reset flows (`email.service.ts`).
- **CSV Data Import & Export Wizard**: Multi-step drag-and-drop CSV importer with column auto-mapping and dry-run validation, plus full CSV/JSON data export.

### 🔒 Enterprise Security & Administration
- **Multi-Tenant Data Isolation**: Strict tenant isolation across all database queries via company-scoped parameters (`company_id`).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (`OWNER`, `ADMIN`, `ANALYST`, `DEVELOPER`).
- **Security Audit Logs**: Comprehensive security event logging with IP, user-agent, action metadata, and pageable audit log viewer with rate-limit IP lockout resets.
- **Two-Factor Authentication (2FA)**: TOTP MFA enrollment and verification.
- **Executive Board Deck Modal**: Generate print-ready PDF/HTML board reports summarizing core SaaS metrics for investor updates.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Recharts, TanStack Query, Lucide Icons
* **Backend**: Node.js, Express, TypeScript, Prisma ORM
* **Database**: SQLite (dev) / PostgreSQL (production) with DB indexes on all tenant query paths
* **Auth & Security**: JWT (HttpOnly cookies), bcrypt (12 rounds), TOTP MFA, Helmet, CORS, Express Rate Limit, SHA-256 API Keys
* **Caching**: In-process TTL Cache (`kpi-cache.ts`) with automatic boot-time cache warm-up (`warmUpCache()`)

---

## 📁 Repository Structure

```
pulse-saas/
├── apps/
│   ├── api/                        # Express API Backend
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Prisma ORM Data Models (Company, AdminUser, Customer, MRRSnapshot, etc.)
│   │   ├── src/
│   │   │   ├── app.ts              # Express Application Bootstrap & Global Middleware
│   │   │   ├── jobs/               # Background Jobs (Daily MRR Snapshot Rollover Worker)
│   │   │   └── modules/
│   │   │       ├── accounts/       # Customer CRM, Notes, & Saved Segments
│   │   │       ├── analytics/      # KPIs, MRR Goals, Health Scores, Cohorts, & Predictive Churn AI
│   │   │       ├── api-keys/       # Scoped API Key Management & Bearer Auth Middleware
│   │   │       ├── audit/          # Security Audit Logging & IP Lockout Management
│   │   │       ├── auth/           # JWT, Password Reset, MFA, & Team Invites
│   │   │       ├── billing/        # Stripe Webhooks, Webhook Simulator, & Dunning Recovery
│   │   │       ├── export/         # CSV/JSON Data Export & CSV Import Wizard Engine
│   │   │       ├── notifications/  # Slack Integration & Transactional Email Delivery
│   │   │       ├── shared/         # Prisma Client, KPI Cache, Env Config, & Validation
│   │   │       └── vendor-billing/ # Plan Gating & Tier Enforcements
│   ├── web/                        # React Frontend (Vite)
│   │   └── src/
│   │       ├── components/         # Reusable Widgets, Charts, Modals, & Table Drawers
│   │       ├── hooks/              # TanStack Query Custom Data Hooks
│   │       ├── lib/                # Axios API Client & Query Client
│   │       └── pages/              # Application Pages (Dashboard, Accounts, Health, Funnel, Billing, Settings, etc.)
├── docker-compose.yml              # Container Deployment Config
├── architecture.md                 # System Architecture & Technical Specifications
└── schema.md                       # Database Schema & Model Definitions
```

---

## ⚡ Quick Start (Local Development)

### 1. Backend Setup
```bash
cd apps/api
cp .env.example .env          # Set DATABASE_URL, JWT_SECRET, COOKIE_SECRET
npm install
npx prisma db push            # Push schema to SQLite database
npx prisma db seed            # Seed demo data (admin@pulse.example / changeme123)
npm run dev                   # Starts API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd apps/web
cp .env.example .env          # Set VITE_API_URL=http://localhost:5000
npm install
npm run dev                   # Starts React app on http://localhost:3000
```

### 3. Demo Credentials
- **Email**: `admin@pulse.example`
- **Password**: `changeme123`

---

## 🧪 Verification & Build Commands

```bash
# Check Backend TypeScript Types
cd apps/api && npx tsc --noEmit

# Check Frontend TypeScript Types
cd apps/web && npx tsc --noEmit
```

---

## 📄 License & Attribution

Distributed under the MIT License. Built with modern software engineering best practices.
