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

/**
 * Fix C-2 (Host Header Injection): Validate CLIENT_ORIGIN is a real https:// URL in production.
 * If it were derived from req.hostname or misconfigured to point at an attacker domain,
 * password reset emails would link to that domain, handing attackers the reset token.
 */
function validateOrigin(raw: string): string {
  if (isProduction) {
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      throw new Error(
        `CLIENT_ORIGIN "${raw}" is not a valid URL. Set it to your frontend's https:// origin (e.g. https://app.example.com).`
      )
    }
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `CLIENT_ORIGIN must use https:// in production. Got: "${raw}". Refusing to start — reset links would be insecure.`
      )
    }
  }
  return raw
}

/**
 * Fix M-4 (Open Redirect): Validate that Stripe redirect URLs start with clientOrigin.
 * Prevents an env-var misconfiguration from pointing post-payment redirects at an attacker domain.
 */
function validateRedirectUrl(name: string, raw: string, clientOrigin: string): string {
  if (isProduction && !raw.startsWith(clientOrigin)) {
    throw new Error(
      `${name} ("${raw}") must start with CLIENT_ORIGIN ("${clientOrigin}") in production to prevent open redirect.`
    )
  }
  return raw
}

const clientOrigin = validateOrigin(process.env.CLIENT_ORIGIN || 'http://localhost:3000')

const stripeVendorSuccessUrl = process.env.STRIPE_VENDOR_SUCCESS_URL || `${clientOrigin}/billing?success=true`
const stripeVendorCancelUrl  = process.env.STRIPE_VENDOR_CANCEL_URL  || `${clientOrigin}/billing?canceled=true`

export const config = {
  isProduction,
  jwtSecret: requireSecret('JWT_SECRET', 'change-me'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'change-me-refresh'),
  // Fix #11: MFA session token uses its own independent secret so it can be rotated
  // separately from the main JWT secret. Falls back to a dev-only value — never in prod.
  mfaSessionSecret: requireSecret('MFA_SESSION_SECRET', 'change-me-mfa'),
  stripeSecretKey: requireSecret('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: requireSecret('STRIPE_WEBHOOK_SECRET', ''),
  clientOrigin,
  cookieSecret: requireSecret('COOKIE_SECRET', 'dev-cookie-secret'),
  redisUrl: process.env.REDIS_URL || '',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  loginRateLimitMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),

  // Vendor billing — Pulse's own Stripe subscription
  stripeVendorWebhookSecret: requireSecret('STRIPE_VENDOR_WEBHOOK_SECRET', ''),
  stripePriceStarter:    process.env.STRIPE_PRICE_STARTER    || '',
  stripePricePro:        process.env.STRIPE_PRICE_PRO        || '',
  stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
  // Fix M-4: Default to clientOrigin-relative paths; validate custom values start with clientOrigin
  stripeVendorSuccessUrl: validateRedirectUrl('STRIPE_VENDOR_SUCCESS_URL', stripeVendorSuccessUrl, clientOrigin),
  stripeVendorCancelUrl:  validateRedirectUrl('STRIPE_VENDOR_CANCEL_URL',  stripeVendorCancelUrl,  clientOrigin),
}
