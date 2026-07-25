# Pulse SaaS — Design

Design principles, conventions, and the current frontend composition.

---

## 1. Backend Design Conventions

### Layering (per domain)
```
routes  →  service  →  prisma  →  postgres / sqlite
  │           │
schema ← validation (Zod)
```
- **Routes** are thin: parse input via `validateQuery`, call a service method, return JSON.
- **Services** hold all domain logic (`*.service.ts`) — the unit-testable seam.
- **Schemas** (`*.schema.ts`) declare Zod validators; shared validators live in `shared/middleware/validation.ts`.
- **Middleware** (`auth.middleware.ts`, `shared/middleware/validation.ts`) is cross-cutting.

### Auth design
- JWT access token (15 min) + refresh token (7 days) stored in **httpOnly, Secure, SameSite=Strict** cookies.
- `tokenRefreshMiddleware` silently rotates the access token on every request when expired but refresh is still valid. On invalid/missing refresh it clears cookies and calls `next()` — does **not** 401, so public routes remain accessible.
- MFA is TOTP via `speakeasy`: `enrollMfa` writes `mfa_secret` (base32); `confirmMfa` sets `mfa_enabled = true`; `login` verifies the TOTP token when `mfa_enabled` is true.
- Login runs `consumeCpu()` (a real `bcrypt.compare` against a precomputed dummy hash) on the "user not found" path to make timing indistinguishable from a real password check — mitigates user enumeration.

### Config & secrets design
- `shared/lib/config.ts` exports a single `config` object built at module load time.
- `requireSecret(name, fallback)` — in production (`NODE_ENV=production`) throws immediately if the env var is absent; in development it warns and returns the fallback.
- **All five secrets** (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `COOKIE_SECRET`) go through `requireSecret()`. `app.ts` reads `config.cookieSecret` — never `process.env.COOKIE_SECRET` directly.

### Rate-limiting design
- Two limiters: a **global** one (100 req/min on `/api/*`) and a **dedicated auth** limiter (10 req/min on `/api/auth/login` and `/api/auth/register`).
- Both use `createRateLimitStore(prefix)` from `shared/lib/rateLimitStore.ts`:
  - With `REDIS_URL` set → `RedisRateLimitStore` (shared across all replicas, correct at scale).
  - Without → `MemoryStore` (per-instance, fine for single-node dev).
- `RedisRateLimitStore` fails **open**: on Redis errors it logs once and switches to an in-memory fallback, ensuring requests are never incorrectly blocked by infrastructure failure.

### Billing / Stripe design
- Webhook route receives a raw `Buffer` (`express.raw({ type: 'application/json' })`) mounted **before** `express.json()`, so signature verification always has the unmodified body.
- `stripe.client.ts` exposes a single Stripe instance, `verifyWebhookSignature`, and `extractCustomerId`.
- Subscription sync is idempotent via `upsert` on `stripe_subscription_id`.

### Analytics design
- `analytics.service.ts` aggregates KPIs, funnel, and health — avoids duplicating Prisma queries across three route files.
- **Churn rate** is a **rolling 30-day window**: `churned_at: { gte: periodStart }` where `periodStart = now − 30 days`. This matches standard SaaS definitions (not all-time).
- **Health scores** are fetched in a single `findMany` ordered `desc`; in-memory deduplication gives the latest score per customer in O(n) — eliminates the previous N+1 `findFirst` per customer.
- Funnel counts derive all percentages relative to `visitors` (zero-safe via `safePct`).

---

## 2. Frontend Design

### Routing
- `App.tsx` wraps the app in `QueryClientProvider` + `BrowserRouter`.
- Only one route is registered: `<Route path="/" element={<Dashboard />} />`.
- `SideNav` shows only the Dashboard link. Future pages (Funnel, Health, Accounts, Churn Risk) can be added by registering routes in `App.tsx` and restoring the nav items in `SideNav.tsx`.

### Component composition
`pages/Dashboard.tsx` is the single composition root. It:
1. Fetches data via `useKpis()`, `useHealth()`, and `useMrrSeries()`.
2. Computes **real month-over-month % changes** from the MRR series — `pctChange(curr, prev)` — and passes them to `KPICard`.
3. Guards `RetentionRing` with an explicit empty-state check (`healthPct === undefined || customerCount === 0`) — never shows a fallback/placeholder percentage as if it were real data.
4. Passes `totalCustomers` (real value from `useKpis`) to `RetentionRing` — no magic number derivation.

### Component inventory
| Component | Data source | Key behaviour |
|-----------|-------------|---------------|
| `KPICard.tsx` | `GET /api/kpis` | Displays MRR, Customers, Churn, Health with real MoM % arrows |
| `MRRChart.tsx` | `GET /api/mrr` | Recharts line chart; MoM deltas computed from series, not hardcoded |
| `FunnelChart.tsx` | `GET /api/funnel` | Conversion funnel (visitors → signup → trial → paid) |
| `RetentionRing.tsx` | `GET /api/health` via Dashboard | SVG ring; `retained`/`churned` counts from `totalCustomers` prop |
| `AccountsTable.tsx` | `GET /api/accounts` | Paginated (5/page); search debounced 300 ms via `useDebouncedValue` |
| `SideNav.tsx` | — | Only Dashboard link; dead links removed pending route implementation |

### Data flow
```
useKpis()       → api.ts (Axios, credentials:'include') → GET /api/kpis
useMrrSeries()  →                                      → GET /api/mrr
useHealth()     →                                      → GET /api/health
useAccounts()   →                                      → GET /api/accounts
                         ↓
              React Query cache (queryClient.ts)
                         ↓
Dashboard.tsx → KPICard / MRRChart / FunnelChart / RetentionRing / AccountsTable
```

### `useDebouncedValue` pattern
```ts
// AccountsTable.tsx
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

// Usage
const debouncedFilter = useDebouncedValue(filter, 300)
useAccounts(page, rowsPerPage, undefined, debouncedFilter || undefined)
```

### Shared UI contract
- `shared/lib/api.ts` — Axios instance with `baseURL` from `VITE_API_URL`, `withCredentials: true`; dispatches a `CustomEvent('auth:unauthorized')` on a 401 response (for future redirect-to-login listener).
- `shared/lib/queryClient.ts` — single `QueryClient` instance shared across the app.

---

## 3. Security & Config design
- `helmet` CSP: `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-src 'none'`.
- HSTS: `maxAge: 31536000` (1 year), `includeSubDomains`, `preload`.
- Global rate limiter on `/api/*`; tighter auth limiter on login/register endpoints.
- CORS restricted to `config.clientOrigin`; cookies are `SameSite=Strict` + `Secure` in prod.
- All five secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) enforce fail-fast at boot via `requireSecret()`.

---

## 4. Naming & Style Conventions
- Domain folder = lowercase singular (`auth`, `accounts`, `billing`).
- Files: `*.routes.ts`, `*.service.ts`, `*.schema.ts`, `*.middleware.ts`, `*.client.ts`.
- All money = integer cents. All timestamps = UTC `Date`.
- Route handlers return `{ success }` / `{ error }` envelopes; services throw on failure.
- Empty states shown explicitly — never substitute a plausible-looking placeholder for missing data.
