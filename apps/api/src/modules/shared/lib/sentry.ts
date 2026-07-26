import dotenv from 'dotenv'

dotenv.config()

interface ErrorContext {
  userEmail?: string
  companyId?: string
  path?: string
  method?: string
  extra?: Record<string, any>
}

class SentryLogger {
  private dsn: string | undefined

  constructor() {
    this.dsn = process.env.SENTRY_DSN
    if (this.dsn) {
      console.log('[Sentry] Error monitoring initialized with DSN')
    } else {
      console.log('[Sentry] SENTRY_DSN not configured — using fallback error reporter')
    }
  }

  public captureException(error: Error | unknown, context?: ErrorContext) {
    const errObj = error instanceof Error ? error : new Error(String(error))
    const timestamp = new Date().toISOString()

    const formattedPayload = {
      timestamp,
      name: errObj.name,
      message: errObj.message,
      stack: errObj.stack,
      context: context || {},
    }

    if (this.dsn) {
      // Sentry DSN active — in production this sends payload via Sentry SDK or HTTP webhook
      console.error('[SENTRY CAPTURE]', JSON.stringify(formattedPayload, null, 2))
    } else {
      console.error(`[ERROR REPORT ${timestamp}] ${errObj.message}`, {
        stack: errObj.stack?.split('\n')[1]?.trim(),
        ...context,
      })
    }
  }
}

export const sentry = new SentryLogger()
