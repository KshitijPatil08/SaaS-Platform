# 🔒 Pulse SaaS — Security Model & Defense-in-Depth

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

## 4. Input Validation & Webhook Verification

- **Strict Schema Validation**: All request queries and bodies are parsed with Zod schemas (`validateQuery`, `validateBody`).
- **Parameterized SQL Queries**: All database operations go through Prisma ORM (parameterized SQL statements only — zero raw SQL string concatenation).
- **Stripe Webhook Signatures**: Raw body buffer parsing (`express.raw()`) is executed before JSON parsing. Webhooks verify signatures via `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.

---

## 5. Security Audit Logging

- **Audit Service (`audit.service.ts`)**: Automatically logs sensitive administrative actions (`LOGIN`, `PASSWORD_RESET`, `EXPORT_DATA`, `REVOKE_API_KEY`, `INVITE_ADMIN`) with user email, action name, IP address, user-agent, and metadata.
- **Audit Viewer**: Pageable audit log interface in `Settings > Audit Logs`.

---

## 6. Enterprise Security Checklist

- [x] All 5 production secrets enforced at boot via `requireSecret()`.
- [x] JWT access & refresh tokens transmitted exclusively in `HttpOnly`, `SameSite=Strict` cookies.
- [x] Scoped API keys hashed with SHA-256 (`api-key.middleware.ts`).
- [x] Password reset links generated with 64-char crypto-random tokens and 1-hour expiration.
- [x] Non-root container security context (`runAsUser: 1000`) in Docker & Kubernetes manifests.
