import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

import { config } from './modules/shared/lib/config'
import { createRateLimitStore } from './modules/shared/lib/rateLimitStore'
import { verifyJwt, tokenRefreshMiddleware } from './modules/auth/auth.middleware'
import { validateQuery, exportQuerySchema } from './modules/shared/middleware/validation'
import kpisRouter from './modules/analytics/kpis.routes'
import mrrRouter from './modules/billing/billing.routes'
import funnelRouter from './modules/analytics/funnel.routes'
import accountsRouter from './modules/accounts/accounts.routes'
import healthRouter from './modules/analytics/health.routes'
import exportRouter from './modules/export/export.routes'
import authRouter from './modules/auth/auth.routes'
import stripeWebhookRouter from './modules/billing/stripe.webhook'

dotenv.config()

const app = express()

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
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

// CORS Configuration
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Body Parsing
// Stripe webhooks require the RAW request body (Buffer) for signature
// verification, so the raw parser must run for that path BEFORE express.json().
// express.json() skips paths where the body was already consumed.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser(process.env.COOKIE_SECRET))

// Health Check (before auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Token Refresh Middleware
app.use(tokenRefreshMiddleware)

// Auth routes (public)
app.use('/api/auth', authRouter)

// Protected Routes
app.use('/api/kpis', verifyJwt, kpisRouter)
app.use('/api/mrr', verifyJwt, mrrRouter)
app.use('/api/funnel', verifyJwt, funnelRouter)
app.use('/api/accounts', verifyJwt, accountsRouter)
app.use('/api/health', verifyJwt, healthRouter)
app.use('/api/export', verifyJwt, exportRouter)

// Stripe Webhook (raw body required)
app.use('/webhooks/stripe', stripeWebhookRouter)

// Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})

export default app