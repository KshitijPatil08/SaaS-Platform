# Pulse Dashboard — Deployment Guide

This package is designed to run **inside your own infrastructure**. You own the data; we own the code.

## What you provide
| Item | Why |
|------|-----|
| Server / VPS / K8s cluster | To run the containers |
| PostgreSQL (optional) | Data persistence — can be RDS, Azure DB, or on-prem |
| Stripe Secret Key | MRR / subscription sync |
| Mixpanel/Segment Token (optional) | Funnel / activation data |
| Domain name | White-label URL |

## Option A — Single VPS with Docker Compose (simplest)
1. Install Docker + docker-compose on the server.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in your values
   (especially `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`).
3. Run migrations + seed:
   ```bash
   docker compose run --rm api npx prisma migrate deploy
   docker compose run --rm api npx prisma db seed
   ```
4. Start:
   ```bash
   docker compose up -d
   ```
5. Point your domain's DNS to the server and terminate TLS (e.g. Caddy / Traefik / nginx).

## Option B — Kubernetes (Helm)
```bash
# 1. Create the secrets first
kubectl create secret generic pulse-api-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=DATABASE_URL='postgresql://user:pass@your-db:5432/pulse' \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx

# 2. Install
helm install pulse-dashboard ./charts/pulse-dashboard \
  --set ingress.webHost=app.yourcompany.com \
  --set ingress.apiHost=api.yourcompany.com
```

## Security checklist before go-live
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` are unique 32+ byte random values
- [ ] `DATABASE_URL` points to a TLS-enabled PostgreSQL instance
- [ ] Webhooks are verified (Stripe signature check)
- [ ] TLS is enforced (HSTS, HTTP→HTTPS redirect)
- [ ] CORS `CLIENT_ORIGIN` is set to your exact frontend domain
- [ ] Rate limiting is active

## Updating
```bash
docker compose pull && docker compose up -d   # compose
helm upgrade pulse-dashboard ./charts/pulse-dashboard   # k8s
```
