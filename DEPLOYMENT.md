#  Pulse SaaS — Deployment Guide

Pulse SaaS is an enterprise-grade, self-hostable SaaS analytics engine designed for **zero-data-leakage deployment** inside your own cloud infrastructure (VPS, AWS EC2, GCP, Azure, or Kubernetes). You maintain 100% data custody.

---

##  Required Infrastructure Secrets

| Secret Variable | Purpose | Generation Command / Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string to PostgreSQL (or SQLite in dev) | `postgresql://user:pass@host:5432/pulse` |
| `JWT_SECRET` | Access token signing (15 min TTL) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing (7 d TTL) | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Cookie signature verification | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Live Stripe API Key | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signature Verification | `whsec_xxx` |
| `CLIENT_ORIGIN` | Allowed Frontend Origin | `https://app.yourcompany.com` |
| `REDIS_URL` | Shared Rate-Limit Store (optional for multi-replica) | `redis://your-redis:6379` |
| `SLACK_WEBHOOK_URL` | Optional global default Slack channel alert webhook | `https://hooks.slack.com/services/xxx` |

>  **Fail-Fast Security Guarantee**: In production (`NODE_ENV=production`), the API will **refuse to start** if any required secret is missing. This is enforced at boot by `modules/shared/lib/config.ts`.

---

##  Option A — Docker Compose Deployment

### 1. Configure Production Environment
Copy `apps/api/.env.example` to `apps/api/.env` on your target server:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://pulse_user:securepass@postgres:5432/pulse?schema=public
JWT_SECRET=super_secret_jwt_key_32_bytes_min
JWT_REFRESH_SECRET=super_secret_refresh_key_32_bytes
COOKIE_SECRET=super_secret_cookie_signing_key_32
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLIENT_ORIGIN=https://app.yourcompany.com
REDIS_URL=redis://redis:6379
```

### 2. Deploy Schema & Run Migrations
```bash
# Push Prisma schema and deploy migrations
docker compose run --rm api npx prisma db push

# (Optional) Seed demo baseline company & admin user
docker compose run --rm api npx prisma db seed
```

### 3. Launch Containers
```bash
docker compose up -d --build
```
The API server automatically launches the **Daily MRR Snapshot Rollover Worker** (`jobs/mrr-snapshot.job.ts`) and triggers the **KPI Cache Warm-Up Engine** (`warmUpCache`) 3 seconds post-boot.

---

##  Option B — Kubernetes Deployment (Helm)

```bash
# 1. Create Kubernetes Secret object
kubectl create secret generic pulse-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@postgres-host:5432/pulse' \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=JWT_REFRESH_SECRET=$(openssl rand -base64 32) \
  --from-literal=COOKIE_SECRET=$(openssl rand -base64 32) \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx \
  --from-literal=REDIS_URL=redis://redis-cluster:6379

# 2. Deploy via Helm
helm install pulse-dashboard ./charts/pulse-dashboard \
  --set ingress.webHost=app.yourcompany.com \
  --set ingress.apiHost=api.yourcompany.com
```

* Containers execute under a non-root security context (`runAsUser: 1000`, `allowPrivilegeEscalation: false`).
* TLS is terminated via `cert-manager` Ingress controllers.

---

##  Go-Live Security & Health Checklist

- [ ] All 5 core secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) use 32+ byte crypto-random strings.
- [ ] `NODE_ENV=production` is set to trigger fail-fast secret verification on boot.
- [ ] `DATABASE_URL` connects to a TLS-encrypted PostgreSQL cluster with connection pooling enabled.
- [ ] Database indexes applied via `npx prisma db push`.
- [ ] Reverse proxy (Nginx / Traefik / Caddy) enforces HTTP $\rightarrow$ HTTPS redirects and HSTS headers (`max-age=31536000`).
- [ ] Stripe webhook endpoint URL is registered in Stripe Dashboard (`https://api.yourcompany.com/webhooks/stripe`).

---

##  Database Backup & Disaster Recovery (RPO / RTO)

### Automated Daily Backup Script (`backup.sh`)
```bash
#!/usr/bin/env bash
set -eo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/pulse"
DB_NAME="pulse"
S3_BUCKET="s3://your-company-pulse-backups"

mkdir -p "$BACKUP_DIR"

# Compressed pg_dump backup
pg_dump -F c -b -v -h localhost -U pulse_user "$DB_NAME" > "$BACKUP_DIR/pulse_$TIMESTAMP.dump"

# Upload to S3 with AES-256 encryption
aws s3 cp "$BACKUP_DIR/pulse_$TIMESTAMP.dump" "$S3_BUCKET/" --sse AES256

# Prune local backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +7 -delete
```

* **RPO (Recovery Point Objective)**: $< 15$ minutes (with WAL archiving / AWS RDS Point-in-Time Recovery).
* **RTO (Recovery Time Objective)**: $< 60$ minutes to restore dump and run schema sync.
