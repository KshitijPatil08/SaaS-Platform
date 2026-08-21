import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { doubleCsrf } from 'csrf-csrf'

import { config } from './modules/shared/lib/config'
import { createRateLimitStore } from './modules/shared/lib/rateLimitStore'
import { verifyJwt, tokenRefreshMiddleware } from './modules/auth/auth.middleware'
import { validateQuery } from './modules/shared/middleware/validation'
import kpisRouter from './modules/analytics/kpis.routes'
import mrrRouter from './modules/billing/billing.routes'
import funnelRouter from './modules/analytics/funnel.routes'
import accountsRouter from './modules/accounts/accounts.routes'
import healthRouter from './modules/analytics/health.routes'
import churnRouter from './modules/analytics/churn.routes'
import cohortsRouter from './modules/analytics/cohorts.routes'
import exportRouter from './modules/export/export.routes'
import auditRouter from './modules/audit/audit.routes'
import authRouter from './modules/auth/auth.routes'
import stripeWebhookRouter from './modules/billing/stripe.webhook'
import vendorBillingRouter from './modules/vendor-billing/vendor-billing.routes'
import vendorWebhookRouter from './modules/vendor-billing/vendor-billing.webhook'
import { planGate, exportGate } from './modules/vendor-billing/plan-gate.middleware'
import { startSnapshotWorker } from './jobs/mrr-snapshot.job'
import { startHealthScoreWorker } from './jobs/health-score.job'
import { warmUpCache } from './modules/shared/lib/kpi-cache'
import { prisma } from './modules/shared/lib/prisma'
import apiKeysRouter from './modules/api-keys/api-keys.routes'
import notificationsRouter from './modules/notifications/slack-notifications.service'
import inAppNotificationsRouter from './modules/notifications/notifications.routes'
import dunningRouter from './modules/billing/dunning.routes'
import webhookSimulatorRouter from './modules/billing/webhook-simulator.routes'
import healthRulesRouter from './modules/analytics/health-rules.routes'
import csvImportRouter from './modules/accounts/csv-import.routes'
import mrrGoalRouter from './modules/analytics/mrr-goal.routes'
import customerNotesRouter from './modules/accounts/customer-notes.routes'
import savedSegmentsRouter from './modules/accounts/saved-segments.routes'
import statusRouter from './modules/shared/status.routes'
import trialExpiryRouter from './modules/analytics/trial-expiry.routes'
import { apiKeyMiddleware } from './modules/api-keys/api-key.middleware'
import { sentry } from './modules/shared/lib/sentry'

dotenv.config()

const app = express()

// Trust Railway's reverse-proxy (one hop).
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// because it sees X-Forwarded-For but trust proxy is disabled (the default).
// '1' means we trust exactly one upstream proxy — correct for Railway.
app.set('trust proxy', 1)

// Initialize background workers on boot
if (process.env.NODE_ENV !== 'test') {
  startSnapshotWorker()        // daily MRR snapshot waterfall calculations
  startHealthScoreWorker()     // nightly health score recomputation for all customers
}

// Security Headers
// connectSrc must include the API's own Railway origin so that the
// Vercel-hosted frontend can make XHR/fetch calls without CSP blocking them.
const apiOrigin = config.clientOrigin // e.g. https://your-app.vercel.app
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Allow Google Fonts stylesheet (styleSrcElem) + inline styles for Vite
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      // Allow the frontend origin to connect back to this API
      connectSrc: ["'self'", apiOrigin],
      // Allow Google Fonts to serve the actual .woff2 files
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// Global API rate limiting — shared across instances via Redis
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  store: createRateLimitStore('global'),
})
app.use('/api/', limiter)

// Stricter limiter on auth endpoints to blunt credential-stuffing / brute force
const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.loginRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  store: createRateLimitStore('auth'),
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
// Protect forgot-password from email enumeration via rate limiting
app.use('/api/auth/forgot-password', authLimiter)
// Fix #3: Protect MFA enrollment/confirmation — prevents TOTP brute-force during setup
app.use('/api/auth/mfa/enroll',   authLimiter)
app.use('/api/auth/mfa/confirm',  authLimiter)
// Protect the two-step MFA login flow: credential stuffing on challenge, TOTP brute-force on verify
app.use('/api/auth/mfa/challenge', authLimiter)
app.use('/api/auth/mfa/verify', authLimiter)
// Fix #5: Protect reset-password from token-probe timing attacks and bcrypt DoS
app.use('/api/auth/reset-password', authLimiter)

// CORS Configuration
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token'],
}))

// Body Parsing
// Stripe webhooks require the RAW request body (Buffer) for signature
// verification, so the raw parser must run for that path BEFORE express.json().
// express.json() skips paths where the body was already consumed.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }))
app.use('/webhooks/stripe-vendor', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser(config.cookieSecret))

// ── Webhook Routes (registered BEFORE CSRF middleware) ────────────────────────
// Stripe webhooks are authenticated via HMAC signature, NOT cookies, so they
// are legitimately exempt from CSRF token checks. Registering them here —
// before app.use(doubleCsrfProtection) — means they are processed by Express
// before the CSRF middleware runs, without needing a CSRF exemption flag.
// Rate-limited separately to prevent DoS on the public webhook endpoint.
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // Stripe sends at most ~10 events/s in bursts; 300 is generous
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests, please try again later.' },
})
app.use('/webhooks/', webhookLimiter)
app.use('/webhooks/stripe', stripeWebhookRouter)
app.use('/webhooks/stripe-vendor', vendorWebhookRouter)

// ── CSRF Protection ───────────────────────────────────────────────────────────
// csrf-csrf (double-submit cookie pattern) is applied AFTER webhook routes but
// BEFORE all API routes — every API route handler registered below is protected.
// GET/HEAD/OPTIONS are safe methods and are excluded from validation by default.
// The frontend must:
//   1. Fetch the CSRF token via GET /api/csrf-token (token returned in JSON)
//   2. Send it as the 'x-csrf-token' request header on every POST/PUT/PATCH/DELETE
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.cookieSecret,
  // Session identifier — use the signed auth cookie (or fall back to empty string)
  // so the HMAC-bound token is tied to this browser session.
  getSessionIdentifier: (req) => (req.cookies?.['psm.sid'] as string) ?? '',
  // __Host- prefix enforces Secure + Path=/ + no Domain — production only.
  // In development (HTTP), browsers silently reject __Host- cookies, breaking
  // CSRF validation. Use a plain name in dev so the cookie is accepted on localhost.
  //
  // NOTE: __Host- cookies cannot be used with SameSite:None cross-origin in some
  // browsers. In production (cross-origin Vercel→Railway) we use a plain name
  // with SameSite:None so the browser actually sends the cookie on cross-site requests.
  cookieName: config.isProduction ? 'psm.csrf' : 'psm.csrf',
  cookieOptions: {
    // SameSite:'none' is REQUIRED for cross-origin requests (Vercel → Railway).
    // SameSite:'strict' or 'lax' causes the browser to silently drop the cookie
    // on cross-site fetches, making every CSRF check fail with "invalid token".
    // SameSite:'none' must be paired with Secure:true (HTTPS only).
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
    httpOnly: true,
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
})
app.use(doubleCsrfProtection)

// Health Check (before auth — GET only, excluded from CSRF check by default)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Expose a GET endpoint so the client can fetch the initial CSRF token.
// generateCsrfToken sets the CSRF cookie and returns the token value.
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) })
})

// Token Refresh Middleware
app.use(tokenRefreshMiddleware)

// ─── Global API Key bearer token auth (runs before JWT check) ──────────────────
// If request has Authorization: Bearer pulse_live_xxx, apiKeyMiddleware validates
// it and sets req.companyId so all protected routes below work transparently.
app.use(apiKeyMiddleware)

// Auth routes (public — CSRF applied globally above)
app.use('/api/auth', authRouter)

// Protected Routes (planGate enforces customer cap per subscription tier)
app.use('/api/kpis', verifyJwt, planGate, kpisRouter)
app.use('/api/mrr', verifyJwt, mrrRouter)
app.use('/api/funnel', verifyJwt, planGate, funnelRouter)
app.use('/api/accounts', verifyJwt, planGate, accountsRouter)
app.use('/api/health', verifyJwt, planGate, healthRouter)
app.use('/api/health-rules', verifyJwt, healthRulesRouter)
app.use('/api/churn', verifyJwt, planGate, churnRouter)
app.use('/api/analytics', verifyJwt, planGate, cohortsRouter)
app.use('/api/export', verifyJwt, exportGate, exportRouter)
app.use('/api/import', verifyJwt, csvImportRouter)
app.use('/api/audit-logs', verifyJwt, auditRouter)
app.use('/api/api-keys', verifyJwt, apiKeysRouter)
app.use('/api/notifications', verifyJwt, notificationsRouter)
app.use('/api/in-app-notifications', verifyJwt, inAppNotificationsRouter)
app.use('/api/dunning', verifyJwt, dunningRouter)
app.use('/api/webhooks-simulator', verifyJwt, webhookSimulatorRouter)
app.use('/api/mrr-goal', verifyJwt, mrrGoalRouter)
app.use('/api/customer-notes', verifyJwt, customerNotesRouter)
app.use('/api/saved-segments', verifyJwt, savedSegmentsRouter)
app.use('/api/analytics/trial-expiry', verifyJwt, planGate, trialExpiryRouter)

// Public — no auth required
app.use('/api/status', statusRouter)

// Vendor Billing — Pulse's own subscription management
app.use('/api/vendor-billing', verifyJwt, vendorBillingRouter)

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  sentry.captureException(err, {
    path: req.path,
    method: req.method,
    companyId: (req as any).companyId,
  })
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5000
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`)
    // Warm up KPI cache 3s after boot so first requests don't cold-start the DB
    setTimeout(() => warmUpCache(prisma).catch(console.warn), 3000)
  })
}

export default app