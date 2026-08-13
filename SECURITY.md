# Pulse SaaS — Security Model & Defense-in-Depth

Pulse SaaS is engineered for enterprise security, strict multi-tenant isolation, and zero-trust authentication across all application layers.

---

## 1. Authentication & Session Security

### Dual JWT Cookie Architecture
- **Access Tokens**: Short-lived (15 minutes), signed with `JWT_SECRET`.
- **Refresh Tokens**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`, stored in `HttpOnly, Secure, SameSite=Strict` cookies.
- **Silent Rotation**: `tokenRefreshMiddleware` automatically rotates access tokens before expiration without client disruption.
- **XSS Protection**: Tokens are never stored in `localStorage` or accessible via JavaScript.

### Scoped Developer API Keys
- **SHA-256 Hashing**: API keys are generated as `pulse_live_<hex>` and hashed via SHA-256 (`hashed_key`). Plaintext keys are shown only once upon creation.
- **Bearer Token Middleware**: `apiKeyMiddleware` authenticates `Authorization: Bearer pulse_live_xxx` requests, populating tenant context (`req.companyId`) and validating key scopes.

### Timing Attack & Enumeration Defense
- **Constant-Time CPU Work**: Login executes a pre-computed `bcrypt.compare` on "user not found" paths (`consumeCpu()`), making valid vs. invalid email check response times indistinguishable.

### Two-Factor Authentication (2FA)
- **TOTP MFA**: Integrated 2FA using `speakeasy` base32 TOTP secret verification required at sign-in when `mfa_enabled = true`.

---

## 2. Multi-Tenant Data Isolation

- **Tenant Scope Enforcement**: All Prisma database queries enforce `where: { company_id: req.companyId }` extracted from authenticated sessions.
- **Database Composite Constraints**: `MRRSnapshot` enforces `@@unique([company_id, date])` and `Customer` enforces `@@unique([company_id, external_id])`, preventing cross-tenant collisions.

---

## 3. Rate Limiting & Denial-of-Service Defense

- **Global API Rate Limiter**: 100 requests / minute per IP on `/api/*`.
- **Dedicated Auth Rate Limiter**: 10 requests / minute per IP on `/api/auth/login` and `/api/auth/register` to prevent brute-force attacks.
- **Redis-Backed Store**: Multi-replica rate limiting supported via `RedisRateLimitStore` (`REDIS_URL`).
- **Fail-Open Fault Tolerance**: If Redis is unreachable, the rate-limiter falls back to local memory without blocking valid application traffic.
- **Admin Lockout Resets**: Security admins can view locked-out IPs and reset rate limits inside `Settings > Security Audit Logs`.

---

## 4. CSRF Protection

- **Double-Submit Cookie Pattern**: All state-changing API routes (`POST`, `PUT`, `PATCH`, `DELETE`) are protected by [`csrf-csrf`](https://github.com/Psifi-Solutions/csrf-csrf) via `doubleCsrfProtection` middleware (`app.ts:163`).
- **Token Delivery**: The frontend fetches a fresh CSRF token via `GET /api/csrf-token`. The token is set as a `HttpOnly`, `SameSite=Strict`, `__Host-`-prefixed cookie and must be echoed in the `x-csrf-token` request header on every mutating request.
- **HMAC-Bound Tokens**: Each CSRF token is tied to `COOKIE_SECRET` via HMAC, making it cryptographically unguessable without the server secret.
- **Webhook Exemption**: Stripe webhooks (`/webhooks/stripe`, `/webhooks/stripe-vendor`) are registered **before** the CSRF middleware and authenticated exclusively via Stripe HMAC signature — they do not use cookies.
- **Dependency Hardening**: `csurf` (deprecated, `cookie@0.4.0` CVE) has been replaced. The `cookie` package is pinned to `>=0.7.0` via npm `overrides` in `apps/api/package.json`.

---

## 5. Input Validation & Webhook Verification

- **Strict Schema Validation**: All request queries and bodies are parsed with Zod schemas (`validateQuery`, `validateBody`).
- **Parameterized SQL Queries**: All database operations go through Prisma ORM (parameterized SQL statements only — zero raw SQL string concatenation).
- **Stripe Webhook Signatures**: Raw body buffer parsing (`express.raw()`) is executed before JSON parsing. Webhooks verify signatures via `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.

---

## 6. Security Audit Logging

- **Audit Service (`audit.service.ts`)**: Automatically logs sensitive administrative actions (`LOGIN`, `PASSWORD_RESET`, `EXPORT_DATA`, `REVOKE_API_KEY`, `INVITE_ADMIN`) with user email, action name, IP address, user-agent, and metadata.
- **Audit Viewer**: Pageable audit log interface in `Settings > Audit Logs`.

---

## 7. Enterprise Security Checklist

- [x] All 5 production secrets enforced at boot via `requireSecret()`.
- [x] JWT access & refresh tokens transmitted exclusively in `HttpOnly`, `SameSite=Strict` cookies.
- [x] Scoped API keys hashed with SHA-256 (`api-key.middleware.ts`).
- [x] Password reset links generated with 64-char crypto-random tokens and 1-hour expiration.
- [x] Non-root container security context (`runAsUser: 1000`) in Docker & Kubernetes manifests.
- [x] CSRF double-submit cookie protection applied globally via `csrf-csrf` (`doubleCsrfProtection`).
- [x] Deprecated `csurf` removed; `cookie` CVE (< 0.7.0) remediated — pinned to `>=0.7.0` via npm overrides.
- [x] CSRF cookie uses `__Host-` prefix enforcing `Secure`, `Path=/`, and no `Domain` attribute.
