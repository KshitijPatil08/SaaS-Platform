import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

import { verifyJwt, tokenRefreshMiddleware } from './middleware/auth'
import { validateQuery, exportQuerySchema } from './middleware/validation'
import kpisRouter from './routes/kpis'
import mrrRouter from './routes/mrr'
import funnelRouter from './routes/funnel'
import accountsRouter from './routes/accounts'
import healthRouter from './routes/health'
import exportRouter from './routes/export'
import authRouter from './routes/auth'
import stripeWebhookRouter from './routes/webhook/stripe'

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

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Body Parsing
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