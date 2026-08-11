/**
 * test/setup.ts — Vitest global test setup
 *
 * SECURITY (CodeQL alert #10 — Clear-text logging of sensitive information):
 * In test environments, console.log/console.error may inadvertently print
 * environment variables that contain secrets (JWT secrets, API keys, etc.).
 * This setup intercepts console output in tests and redacts values that match
 * known secret environment variable names before they reach stdout/stderr.
 */

const SECRET_ENV_KEYS = new Set([
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_VENDOR_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
])

/**
 * Builds a redaction map: { actualValue → '[REDACTED:<KEY>]' } for all
 * secret env vars that are currently set to non-empty values.
 */
function buildRedactionMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key]
    // Only redact non-trivial values — skip empty strings and test placeholders
    // shorter than 8 chars that are obviously not real secrets.
    if (value && value.length >= 8) {
      map.set(value, `[REDACTED:${key}]`)
    }
  }
  return map
}

function redact(message: unknown, redactionMap: Map<string, string>): string {
  let str = typeof message === 'string' ? message : String(message)
  for (const [secret, placeholder] of redactionMap) {
    // Use a global replace — the secret may appear multiple times in a log line
    str = str.split(secret).join(placeholder)
  }
  return str
}

// Intercept console methods in test environment to prevent secret leakage
if (process.env.NODE_ENV === 'test') {
  const redactionMap = buildRedactionMap()

  if (redactionMap.size > 0) {
    const originalLog = console.log.bind(console)
    const originalError = console.error.bind(console)
    const originalWarn = console.warn.bind(console)

    console.log = (...args: unknown[]) =>
      originalLog(...args.map((a) => redact(a, redactionMap)))

    console.error = (...args: unknown[]) =>
      originalError(...args.map((a) => redact(a, redactionMap)))

    console.warn = (...args: unknown[]) =>
      originalWarn(...args.map((a) => redact(a, redactionMap)))
  }
}
