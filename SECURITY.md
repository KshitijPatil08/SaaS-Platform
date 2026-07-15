# Security Model

Pulse is designed to be deployed **inside the client's own infrastructure** (Option 2/3),
so security is defense-in-depth across the stack.

## Authentication & Sessions
- JWT access tokens (15m) stored in **HttpOnly, Secure, SameSite=Strict** cookies.
- Refresh tokens (7d) rotated via `tokenRefreshMiddleware` in `apps/api/src/middleware/auth.ts`.
- No token ever reaches JavaScript — XSS cannot exfiltrate it.
- Login input validated with Zod (`/api/auth/login`); constant-time failure to limit user enumeration.

## Transport & Headers
- Helmet enforces: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, HSTS (1y, preload).
- Frontend `index.html` ships a CSP restricting `connect-src` to the API origin.
- nginx (web image) adds the same headers + 1y immutable caching on `/assets`.

## Input Validation
- All query/body params validated with Zod schemas in `apps/api/src/middleware/validation.ts`.
- DB access only via Prisma (parameterized queries) — no raw SQL, no string interpolation.
- `page`/`pageSize`/`status`/`plan` bounded and enumerated before reaching the DB.

## Rate Limiting
- `express-rate-limit` (100 req/min/IP) on `/api/*`.

## Webhooks
- Stripe webhooks verified with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.
  Invalid signatures are rejected with 400 before any DB write.

## Multi-tenancy
- Every query is scoped by `companyId` (from the verified JWT). One company cannot read another's rows.

## Kubernetes / Deployment
- Containers run as non-root (`runAsNonRoot`, `runAsUser: 1000`), no privilege escalation.
- Secrets are injected via Kubernetes `Secret` / Docker env — never baked into images.
- TLS terminated at Ingress via cert-manager; HTTP→HTTPS redirect enforced.

## MFA (ready to enable)
- `auth.ts` includes an `mfaToken` field and a verification hook point for TOTP (speakeasy).
  Flip it on per-company once enrolled.

## Operational
- `npm audit` in CI; keep dependencies patched.
- Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET` on a schedule.
- Database must use TLS; restrict inbound to the API's network only.
