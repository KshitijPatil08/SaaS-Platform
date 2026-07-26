/**
 * Centralized, validated configuration.
 *
 * Fixes the previous behaviour where each module silently fell back to
 * insecure default secrets ('change-me', '') when env vars were missing.
 * Now: in production, missing required secrets throw at boot; in dev a
 * warning is logged and the insecure default is used only as a last resort.
 */

const isProduction = process.env.NODE_ENV === 'production'

const WEAK_SECRETS = new Set([
  'change-me',
  'change-me-refresh',
  'dev-cookie-secret',
  'secret',
  'password',
  '123456',
  'default',
])

function requireSecret(name: string, fallback: string): string {
  const value = process.env[name]
  if (value) {
    if (isProduction && WEAK_SECRETS.has(value.toLowerCase())) {
      throw new Error(
        `Environment variable ${name} is set to a weak/default secret ("${value}") in production. Set a strong secret before deploying.`
      )
    }
    return value
  }
  if (isProduction) {
    throw new Error(
      `Missing required environment variable ${name} in production. Refusing to start with an insecure fallback.`
    )
  }
  if (fallback !== '') {
    console.warn(`[config] WARNING: ${name} not set — using insecure dev fallback. Set it before deploying.`)
  }
  return fallback
}

export const config = {
  isProduction,
  jwtSecret: requireSecret('JWT_SECRET', 'change-me'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'change-me-refresh'),
  stripeSecretKey: requireSecret('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: requireSecret('STRIPE_WEBHOOK_SECRET', ''),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  cookieSecret: requireSecret('COOKIE_SECRET', 'dev-cookie-secret'),
  redisUrl: process.env.REDIS_URL || '',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  loginRateLimitMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
}
