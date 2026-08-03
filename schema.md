# Pulse SaaS — Database Schema Documentation

> Comprehensive specification of Prisma ORM data models, relations, field constraints, and database indexing strategies for `apps/api/prisma/schema.prisma`.

---

## 1. Entity-Relationship Summary

```
                      ┌───────────────────┐
                      │      Company      │
                      └─────────┬─────────┘
                                │ 1:N
     ┌──────────┬──────────┬────┴─────┬──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Admin   │ │Customer│ │ Event  │ │  MRR   │ │ Churn  │ │ Health │ │ Saved  │
│ User    │ │        │ │        │ │Snapshot│ │ Event  │ │ Score  │ │Segment │
└────┬────┘ └───┬────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
     │ 1:N      │ 1:N
     ▼          ├──────────┬──────────┐
┌─────────┐     ▼          ▼          ▼
│Password │ ┌────────┐ ┌────────┐ ┌────────┐
│ Reset   │ │Subscri-│ │Customer│ │  Event │
│ Token   │ │ ption  │ │ Note   │ │(assoc) │
└─────────┘ └────────┘ └────────┘ └────────┘
```

---

## 2. Model Specifications

### A. Core Tenant Models

#### `Company`
The root tenant model for multi-tenant data isolation.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Unique company tenant identifier |
| `name` | `String` | | Display name of the tenant organization |
| `stripe_id` | `String?` | `@unique` | Optional external Stripe Account ID |
| `plan_tier` | `String` | `@default("free")` | Platform subscription tier (`free`, `starter`, `pro`, `enterprise`) |
| `slack_webhook_url` | `String?` | | Webhook URL for Slack alerts |
| `alert_email` | `String?` | | Email address for security & billing alerts |
| `created_at` | `DateTime` | `@default(now())` | Account creation timestamp |

#### `AdminUser`
Team members with role-based access permissions.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `email` | `String` | | Admin login email address |
| `password_hash` | `String` | | bcrypt (12 rounds) hashed password |
| `role` | `String` | `@default("ADMIN")` | RBAC role (`OWNER`, `ADMIN`, `ANALYST`, `DEVELOPER`) |
| `mfa_secret` | `String?` | | Encrypted TOTP secret key |
| `mfa_enabled` | `Boolean` | `@default(false)` | Two-Factor Authentication flag |

*Indexes*: `@@unique([company_id, email])`, `@@index([email])`

---

### B. Customer CRM & Revenue Models

#### `Customer`
End-user accounts managed by the SaaS tenant.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `external_id` | `String?` | | External provider ID (e.g. Stripe `cus_xxx`) |
| `email` | `String` | | Customer contact email |
| `name` | `String` | | Customer organization/person name |
| `plan` | `String` | | Current subscription plan (`starter`, `pro`, `enterprise`) |
| `status` | `String` | | Lifecycle status (`active`, `past_due`, `canceled`, `trialing`) |
| `mrr_cents` | `Int` | `@default(0)` | Monthly Recurring Revenue in cents USD |
| `billing_cycle` | `String` | | Payment frequency (`monthly`, `yearly`) |
| `trial_ends_at` | `DateTime?` | | Trial expiration date |

*Indexes*: `@@unique([company_id, external_id])`, `@@index([company_id])`, `@@index([status])`

#### `Subscription`
Detailed subscription items linked to customers.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `customer_id` | `String` | Relation to `Customer` | Parent customer reference |
| `stripe_subscription_id` | `String?` | `@unique` | Stripe subscription ID (`sub_xxx`) |
| `plan` | `String` | | Plan identifier |
| `mrr_cents` | `Int` | | Subscription MRR in cents |
| `status` | `String` | | Status (`active`, `past_due`, `canceled`) |
| `current_period_start` | `DateTime` | | Billing period start date |
| `current_period_end` | `DateTime` | | Billing period end date |
| `canceled_at` | `DateTime?` | | Cancellation timestamp |

---

### C. Financial & Analytics Time-Series Models

#### `MRRSnapshot`
Daily aggregated revenue snapshots for MRR waterfall charting.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `date` | `DateTime` | | Normalized UTC midnight date |
| `mrr_cents` | `Int` | | Total active MRR at date |
| `new_mrr_cents` | `Int` | `@default(0)` | New customer acquisition MRR |
| `expansion_mrr_cents` | `Int` | `@default(0)` | Existing customer upgrade MRR |
| `contraction_mrr_cents`| `Int` | `@default(0)` | Existing customer downgrade MRR |
| `churned_mrr_cents` | `Int` | `@default(0)` | Lost MRR from cancellations |
| `customer_count` | `Int` | `@default(0)` | Total active customer count |

*Indexes*: `@@unique([company_id, date])`, `@@index([company_id, date(sort: Desc)])`

#### `HealthScore`
Computed customer retention and health scores.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `customer_id` | `String` | Relation to `Customer` | Target customer reference |
| `score` | `Int` | | Computed health score (0–100) |
| `signals` | `String` | | JSON string of signal breakdown |
| `computed_at` | `DateTime` | `@default(now())` | Calculation timestamp |

*Indexes*: `@@index([company_id])`, `@@index([customer_id])`

#### `Event`
User activity and product interaction events.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `customer_id` | `String?` | Relation to `Customer` | Optional associated customer |
| `name` | `String` | | Event name (e.g. `signup`, `activation`, `payment_failed`) |
| `properties` | `String` | `@default("{}")` | JSON metadata properties |
| `occurred_at` | `DateTime` | `@default(now())` | Event timestamp |

*Indexes*: `@@index([company_id, occurred_at(sort: Desc)])`, `@@index([customer_id])`

---

### D. Security, Settings & Customization Models

#### `ApiKey`
Developer API authentication keys.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `name` | `String` | | Descriptive key name |
| `key_prefix` | `String` | | Obfuscated key prefix (e.g. `pulse_live_a1b2...`) |
| `hashed_key` | `String` | `@unique` | SHA-256 hash of the full raw API key |
| `scopes` | `String` | `@default("read:analytics")` | Comma-separated scope permissions |
| `last_used_at` | `DateTime?` | | Timestamp of last API invocation |
| `revoked_at` | `DateTime?` | | Revocation timestamp |

#### `SavedSegment`
Saved customer directory filter views.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `name` | `String` | | Segment preset name |
| `filters` | `String` | | JSON string of filter parameters |
| `created_at` | `DateTime` | `@default(now())` | Creation timestamp |

#### `CustomerNote`
Internal team CRM notes log per customer.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `company_id` | `String` | Relation to `Company` | Parent tenant reference |
| `customer_id` | `String` | Relation to `Customer` | Target customer reference |
| `author` | `String` | | Email of authoring team member |
| `body` | `String` | | Note text content |
| `created_at` | `DateTime` | `@default(now())` | Creation timestamp |

---

## 3. Database Indexes & Query Optimization Strategy

1. **Multi-Tenant Compound Indexes**: All core entities use `company_id` as the primary index prefix (`@@index([company_id])`), enabling $O(\log N)$ B-Tree lookup performance under high multi-tenant query volume.
2. **Time-Series Ordering Indexes**: Tables with heavy time-range queries (`MRRSnapshot`, `Event`) feature compound descending time indexes (`@@index([company_id, occurred_at(sort: Desc)])`).
3. **Unique Security Lookups**: Sensitive tokens (`ApiKey.hashed_key`, `PasswordResetToken.token`) use `@unique` constraints for $O(1)$ Hash / Unique B-Tree indexing.
