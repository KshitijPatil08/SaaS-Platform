# Pulse Dashboard — Deployment Guide

This package is designed to run **inside your own infrastructure**. You own the data; we own the code.

## What you provide
| Item | Why |
|------|-----|
| Server / VPS / K8s cluster | To run the containers |
| PostgreSQL instance | Data persistence — RDS, Azure DB, Cloud SQL, or on-prem |
| `DATABASE_URL` | Connection string to PostgreSQL (SQLite is dev-only) |
| `JWT_SECRET` + `JWT_REFRESH_SECRET` | Token signing — generate with `openssl rand -base64 32` |
| `COOKIE_SECRET` | Cookie signing — generate with `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | MRR / subscription sync |
| `REDIS_URL` (optional but recommended) | Shares rate-limit counters across API replicas |
| Domain name | White-label URL |

> **Important:** The API will **refuse to start** in production (`NODE_ENV=production`) if any of the
> five required secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY`,
> `STRIPE_WEBHOOK_SECRET`, `COOKIE_SECRET`) are missing. This is intentional — see `shared/lib/config.ts`.

---

## Option A — Single VPS with Docker Compose (simplest)

1. Install Docker + docker-compose on the server.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in all values:
   ```
   DATABASE_URL=postgresql://user:pass@your-db:5432/pulse
   JWT_SECRET=<random 32+ bytes>
   JWT_REFRESH_SECRET=<random 32+ bytes>
   COOKIE_SECRET=<random 32+ bytes>
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   CLIENT_ORIGIN=https://app.yourcompany.com
   REDIS_URL=redis://your-redis:6379        # optional; enables shared rate-limiting
   NODE_ENV=production
   ```
3. Switch schema datasource from `sqlite` to `postgresql` if not already done.
4. Run migrations:
   ```bash
   docker compose run --rm api npx prisma migrate deploy
   ```
5. (Optional) Seed demo data:
   ```bash
   docker compose run --rm api npx prisma db seed
   ```
6. Start all services:
   ```bash
   docker compose up -d
   ```
7. Point your domain's DNS to the server and terminate TLS (e.g. Caddy, Traefik, or nginx).

---

## Option B — Kubernetes (Helm)

```bash
# 1. Create the secrets
kubectl create secret generic pulse-api-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=JWT_REFRESH_SECRET=$(openssl rand -base64 32) \
  --from-literal=COOKIE_SECRET=$(openssl rand -base64 32) \
  --from-literal=DATABASE_URL='postgresql://user:pass@your-db:5432/pulse' \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx \
  --from-literal=REDIS_URL=redis://your-redis:6379

# 2. Install
helm install pulse-dashboard ./charts/pulse-dashboard \
  --set ingress.webHost=app.yourcompany.com \
  --set ingress.apiHost=api.yourcompany.com
```

Containers run as non-root (`runAsUser: 1000`, `allowPrivilegeEscalation: false`).
TLS is terminated at the Ingress via cert-manager.

---

## Security checklist before go-live

- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` are unique 32+ byte random values — **not** the dev fallbacks
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are live (not test) keys
- [ ] `DATABASE_URL` points to a TLS-enabled PostgreSQL instance (not SQLite)
- [ ] `NODE_ENV=production` is set — triggers fail-fast secret validation at boot
- [ ] `CLIENT_ORIGIN` is set to your exact frontend domain (no trailing slash)
- [ ] `REDIS_URL` is set if running more than one API replica (shared rate limiting)
- [ ] TLS is enforced end-to-end (HSTS header is sent; HTTP→HTTPS redirect active)
- [ ] Stripe webhook signature verification is active (400 on bad signature)
- [ ] Prisma migrations have been deployed (`prisma migrate deploy`, not `migrate dev`)

---

## Updating

```bash
# Docker Compose
docker compose pull && docker compose up -d

# Kubernetes (Helm)
helm upgrade pulse-dashboard ./charts/pulse-dashboard
```

After updating, run `npx prisma migrate deploy` if there are new schema migrations
(e.g. the `MRRSnapshot` composite unique constraint added in the latest release).
