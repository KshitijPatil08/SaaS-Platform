# Pulse SaaS — Data Schema

Covers the Prisma models backing each domain and the Zod request schemas that validate input.

## 1. Prisma Models (by domain)

### Auth — `Company` + `AdminUser`
- `Company`
  - `id` (uuid, PK)
  - `name` (string)
  - `stripe_id` (string?, unique — Stripe customer id for the company)
  - `created_at` (datetime)
  - `admins` → `AdminUser[]`
- `AdminUser`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `email` (string, unique per company — `@@unique([company_id, email])`)
  - `password_hash` (string, bcrypt)
  - `mfa_enabled` (bool, default false)
  - `mfa_secret` (string?, base32 TOTP secret; null until enrolled)

### Accounts — `Customer`
- `Customer`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `external_id` (string?, globally unique — Stripe `customer_id`)
  - `name`, `email` (string)
  - `plan` (string: `starter` | `pro` | `enterprise`)
  - `status` (string: `active` | `past_due` | `canceled` | `trialing`)
  - `mrr_cents` (int)
  - `billing_cycle` (string: `monthly` | `yearly`)
  - `trial_ends_at` (datetime?)
  - `created_at` (datetime)

### Billing — `Subscription` + `MRRSnapshot`
- `Subscription`
  - `id` (uuid, PK)
  - `customer_id` (fk → Customer)
  - `stripe_subscription_id` (string?, unique)
  - `plan` (string, Stripe price id)
  - `mrr_cents` (int)
  - `status` (string, Stripe status)
  - `current_period_start` / `current_period_end` (datetime)
  - `canceled_at` (datetime?)
- `MRRSnapshot`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `date` (datetime)
  - `mrr_cents`, `new_mrr_cents`, `expansion_mrr_cents`, `contraction_mrr_cents`, `churned_mrr_cents` (int)
  - `customer_count` (int)
  - **`@@unique([company_id, date])`** — composite unique constraint; safe for multi-tenant use.
    *(Previously `@@unique([date])` — would conflict when two companies shared the same date.)*

### Analytics — `Event` + `HealthScore` + `ChurnEvent`
- `Event`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `customer_id` (fk? → Customer)
  - `name` (string: `visitor` | `signup` | `activation` | `trial_started` | `subscription_created`)
  - `properties` (json string, default `{}`)
  - `occurred_at` (datetime)
- `HealthScore`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `customer_id` (fk → Customer)
  - `score` (int 0–100)
  - `signals` (json string, default `{}`)
  - `computed_at` (datetime)
  - `@@unique([company_id, customer_id, computed_at])` — append-only; queries read latest per customer.
- `ChurnEvent`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `customer_id` (fk → Customer)
  - `mrr_lost_cents` (int)
  - `reason` (string)
  - `churned_at` (datetime) — used to scope rolling-30-day churn rate calculation.

## 2. Zod Request Schemas (by domain)

### Auth (`auth.schema.ts`)
| Schema | Fields |
|--------|--------|
| `loginSchema` | `email`, `password` (min 8), `mfaToken?` (6 digits) |
| `registerSchema` | `companyName` (2–120), `email`, `password` (min 8) |
| `mfaEnrollSchema` | `email`, `password` |
| `mfaConfirmSchema` | `email`, `token` (6 digits) |

### Accounts (`accounts.schema.ts`)
| Schema | Fields |
|--------|--------|
| `accountsQuerySchema` | `page?` (1–1000), `pageSize?` (1–100), `status?`, `plan?`, `search?` |

### Export (`export.schema.ts`)
| Schema | Fields |
|--------|--------|
| `exportQuerySchema` | `format?` (`csv`\|`json`), `range?` |

### Shared (`shared/middleware/validation.ts`)
| Schema | Fields |
|--------|--------|
| `dateRangeSchema` | `start?` (datetime), `end?` (datetime) |

## 3. Relationships (logical)
```
Company 1──* AdminUser
Company 1──* Customer
Company 1──* MRRSnapshot
Company 1──* Event / HealthScore / ChurnEvent
Customer 1──* Subscription   (via external_id → stripe_subscription_id)
Customer 1──* HealthScore    (append-only; read latest per customer)
Customer 1──* ChurnEvent
```

## 4. Notes
- `prisma/schema.prisma` is **cross-domain** and intentionally not split per module.
- All money values are stored as integer **cents**.
- `HealthScore` is append-only per `computed_at`; the service dedupes to the latest score per customer
  in a single query (no N+1 `findFirst` per customer).
- `ChurnEvent.churned_at` is the field filtered for the rolling-30-day churn rate window in `analytics.service.ts`.
- Datasource is `sqlite` for local dev; swap to `postgresql` for production by updating `DATABASE_URL`.
