# 🛠️ Pulse SaaS — Technology Stack Specification

Comprehensive breakdown of technologies, libraries, frameworks, environment variables, and system tooling.

---

## 1. Backend Technology Stack (`apps/api`)

| Layer / Concern | Technology | Version / Implementation Notes |
| :--- | :--- | :--- |
| **Runtime & Server** | Node.js (LTS) | TypeScript, compiled via `tsc` |
| **Language** | TypeScript | Strict mode (`tsc --noEmit` validation) |
| **Web Framework** | Express 4 | Express router pipeline (`app.ts`) |
| **Database ORM** | Prisma ORM | SQLite (development) / PostgreSQL (production) |
| **Auth & Security** | `jsonwebtoken`, `bcrypt`, `speakeasy`, `crypto` | JWT HttpOnly cookies, bcrypt (12 rounds), TOTP MFA, SHA-256 API keys |
| **Request Validation**| `zod` | Type-safe schema validation (`validateQuery`, `validateBody`) |
| **Billing Integration**| Stripe SDK (`stripe`) | Idempotent webhook handling & subscription sync |
| **Security Middleware**| `helmet`, `cors`, `express-rate-limit`, `cookie-parser` | CSP, HSTS, CORS origin protection, cookie signing |
| **Rate Limit Store** | `ioredis` + `RedisRateLimitStore` | Shared Redis counter with fail-open fallback |
| **Caching Engine** | In-Process Memory Cache (`kpi-cache.ts`) | TTL Map with boot-time cache warm-up (`warmUpCache`) |
| **Notifications** | Node `fetch` (Slack API), `nodemailer` | Non-blocking fire-and-forget Slack webhooks & transactional emails |

---

## 2. Frontend Technology Stack (`apps/web`)

| Layer / Concern | Technology | Implementation Notes |
| :--- | :--- | :--- |
| **Build Tool & Dev** | Vite | `vite.config.ts` |
| **UI Library** | React 18 + TypeScript | Component-driven architecture |
| **Routing** | React Router v6 | 11 active page routes (`App.tsx`) |
| **Data Fetching** | TanStack React Query v5 | Server state caching & background refetching (`useKpis.ts`) |
| **HTTP Client** | Axios | `lib/api.ts` with `withCredentials: true` |
| **Charting Engine** | Recharts | MRR waterfall area charts, funnel bars, retention rings |
| **UI Components** | TailwindCSS + Framer Motion | Modern dark mode, glassmorphism, & micro-animations |
| **Icons & Utilities** | `lucide-react`, `clsx` | Lucide icon set & class merging |

---

## 3. Environment Variable Configuration

Loaded and validated at application boot via `modules/shared/lib/config.ts`. In production (`NODE_ENV=production`), missing secrets cause a fail-fast boot termination.

| Environment Variable | Required in Prod | Used By | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` |  Yes | Prisma ORM | Database connection string |
| `JWT_SECRET` |  Yes | Auth Service | Access token signing (15 min) |
| `JWT_REFRESH_SECRET` |  Yes | Auth Service | Refresh token signing (7 days) |
| `COOKIE_SECRET` |  Yes | Cookie Parser | Cookie signature validation |
| `STRIPE_SECRET_KEY` |  Yes | Billing Module | Stripe SDK initialization |
| `STRIPE_WEBHOOK_SECRET`|  Yes | Webhook Handler | Stripe signature verification |
| `CLIENT_ORIGIN` |  Yes | CORS Middleware | Allowed frontend origin |
| `NODE_ENV` |  Yes | Application | `development` / `production` |
| `REDIS_URL` | Recommended | Rate Limiter | Shared rate limit store across replicas |
| `PORT` | Optional | Express App | Server port (default `5000`) |

---

## 4. Key Dependency Map

```
apps/api/package.json
├── @prisma/client & prisma   # Database ORM & CLI
├── express & cors & helmet   # HTTP server & security headers
├── jsonwebtoken & bcrypt     # JWT authentication & password hashing
├── speakeasy                 # TOTP MFA verification
├── zod                       # Request validation
├── stripe                    # Billing webhooks & API
├── ioredis                   # Distributed rate-limit store

apps/web/package.json
├── react & react-dom         # Core UI framework
├── react-router-dom          # Page navigation
├── @tanstack/react-query     # Async data management
├── recharts                  # Interactive data visualization
├── framer-motion             # Smooth entrance animations
├── axios                     # HTTP REST client
└── lucide-react              # UI icon set
```
