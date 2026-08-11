import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

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

dotenv.config()

const app = express()

// Initialize background workers on boot
if (process.env.NODE_ENV !== 'test') {
  startSnapshotWorker()        // daily MRR snapshot waterfall calculations
  startHealthScoreWorker()     // nightly health score recomputation for all customers
}

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Allow Google Fonts stylesheet (styleSrcElem) + inline styles for Vite
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
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

// CORS Configuration
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// Health Check (before auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Token Refresh Middleware
app.use(tokenRefreshMiddleware)

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

// ─── Global API Key bearer token auth (runs before JWT check) ──────────────────
// If request has Authorization: Bearer pulse_live_xxx, apiKeyMiddleware validates
// it and sets req.companyId so all protected routes below work transparently.
app.use(apiKeyMiddleware)

// Auth routes (public)
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

// Stripe Webhooks (raw body required)
app.use('/webhooks/stripe', stripeWebhookRouter)
app.use('/webhooks/stripe-vendor', vendorWebhookRouter)

import { sentry } from './modules/shared/lib/sentry'

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