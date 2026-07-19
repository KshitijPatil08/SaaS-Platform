# Pulse SaaS — Data Schema

Covers the Prisma models backing each domain and the Zod request schemas that validate input.

## 1. Prisma Models (by domain)

### Auth — `Company` + `AdminUser`
- `Company`
  - `id` (uuid, PK)
  - `name` (string)
  - `admins` → `AdminUser[]`
- `AdminUser`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `email` (string, unique per company)
  - `password_hash` (string, bcrypt)
  - `mfa_enabled` (bool)
  - `mfa_secret` (string?, base32 TOTP secret)

### Accounts — `Customer`
- `Customer`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `external_id` (string?, Stripe customer id)
  - `name` (string)
  - `email` (string)
  - `status` (enum: `active`, `past_due`, `canceled`, `trialing`)
  - `plan` (enum: `starter`, `pro`, `enterprise`)
  - `created_at` (datetime)

### Billing — `Subscription` + `MRRSnapshot`
- `Subscription`
  - `id` (uuid, PK)
  - `stripe_subscription_id` (string, unique)
  - `customer_id` (fk → Customer via external_id)
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

### Analytics — `Event` + `HealthScore` + `ChurnEvent`
- `Event`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `name` (string: `visitor`, `signup`, `activation`, `trial_started`, `subscription_created`)
  - `customer_id` (fk?)
  - `created_at` (datetime)
- `HealthScore`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `customer_id` (fk → Customer)
  - `score` (int 0–100)
  - `signals` (json)
  - `computed_at` (datetime)
- `ChurnEvent`
  - `id` (uuid, PK)
  - `company_id` (fk → Company)
  - `customer_id` (fk → Customer)
  - `created_at` (datetime)

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
Customer 1──* Subscription   (via external_id)
Customer 1──1..* HealthScore
Customer 1──* ChurnEvent
```

## 4. Notes
- `prisma/schema.prisma` is **cross-domain** and intentionally not split per module.
- All money values are stored as integer **cents**.
- `HealthScore` is append-only per `computed_at`; queries read the latest per customer.
