# Security Model

Pulse is designed to be deployed **inside the client's own infrastructure** (Option A/B),
so security is defense-in-depth across the stack.

## Secrets & Configuration
- All secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `COOKIE_SECRET`) are loaded through `shared/lib/config.ts`
  via `requireSecret()`.
- **In production**: any missing secret throws at boot — the server refuses to start
  with an insecure fallback. This applies to all 5 secrets without exception.
- **In development**: a warning is logged and a safe-for-dev default is used.
- `app.ts` reads `config.cookieSecret` (not `process.env.COOKIE_SECRET` directly)
  so the fail-fast guarantee is never bypassed.

## Authentication & Sessions
- JWT access tokens (15 min) stored in **HttpOnly, Secure, SameSite=Strict** cookies.
- Refresh tokens (7 d) rotated via `tokenRefreshMiddleware` in `auth.middleware.ts`.
- No token ever reaches JavaScript — XSS cannot exfiltrate it.
- Login input validated with Zod; constant-time dummy `bcrypt.compare` on "user not
  found" path prevents user-enumeration via timing.

## Rate Limiting
- Global limiter: 100 req/min/IP on `/api/*`.
- Dedicated auth limiter: 10 req/win on `/api/auth/login` and `/api/auth/register`
  to blunt credential-stuffing and brute-force attacks.
- Both limiters are backed by a **Redis store** (`shared/lib/rateLimitStore.ts`) so
  counters are shared across all API instances. Fail-open design: if Redis is
  unreachable, each instance falls back to its own in-memory counter rather than
  blocking all traffic.

## Transport & Headers
- `helmet` enforces: CSP (`default-src 'self'`), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS (1 y, includeSubDomains, preload).
- CORS restricted to `CLIENT_ORIGIN`; credentials mode enabled for cookie transport.

## Input Validation
- All query/body params validated with Zod schemas.
- DB access only via Prisma (parameterized queries) — no raw SQL, no string interpolation.
- `page`/`pageSize`/`status`/`plan` bounded and enumerated before reaching the DB.

## Webhooks
- Stripe webhooks verified with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.
  Invalid signatures are rejected with 400 before any DB write.
- Webhook route receives the **raw Buffer** (`express.raw`) — mounted before `express.json()`
  so signature verification is never broken by body pre-parsing.

## Multi-tenancy
- Every query is scoped by `companyId` (from the verified JWT). One company cannot read
  another's rows.
- `MRRSnapshot` unique constraint is `(company_id, date)` — prevents cross-tenant date
  conflicts that would have caused upsert failures under the old single-column `@@unique([date])`.

## Kubernetes / Deployment
- Containers run as non-root (`runAsNonRoot`, `runAsUser: 1000`), no privilege escalation.
- Secrets are injected via Kubernetes `Secret` / Docker env — never baked into images.
- TLS terminated at Ingress via cert-manager; HTTP→HTTPS redirect enforced.

## MFA (enabled per-user)
- TOTP via `speakeasy`: enroll sets `mfa_secret` (base32), confirm enables `mfa_enabled`.
- Login requires a valid 6-digit TOTP token when `mfa_enabled = true`.

## Operational
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` on a schedule.
- Database must use TLS; restrict inbound to the API's network only.
- Review Prisma migrations before deploying schema changes to production.
