import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { prisma } from '../shared/lib/prisma'

/**
 * API Key Bearer Auth Middleware
 *
 * Accepts: Authorization: Bearer pulse_live_<hex>
 * Validates against hashed_key stored in ApiKey table.
 * On success, populates req.companyId and req.adminEmail (set to key name for logging).
 * Also stamps last_used_at on the key so usage analytics work.
 *
 * Falls through to next() if no Bearer token — allows JWT middleware to run after.
 */
export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer pulse_')) {
    return next() // Not an API key request — pass to JWT middleware
  }

  const rawKey = authHeader.slice(7) // strip "Bearer "

  // Hash the raw key the same way we hash on creation: SHA-256
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex')

  try {
    const apiKey = await (prisma as any).apiKey.findUnique({
      where: { hashed_key: hashedKey },
      select: {
        id: true,
        company_id: true,
        name: true,
        scopes: true,
        revoked_at: true,
      },
    })

    if (!apiKey || apiKey.revoked_at !== null) {
      return res.status(401).json({ error: 'Invalid or revoked API key' })
    }

    // Stamp last_used_at asynchronously — don't await, non-blocking
    ;(prisma as any).apiKey.update({
      where: { hashed_key: hashedKey },
      data: { last_used_at: new Date() },
    }).catch(() => {}) // fire-and-forget; ignore errors

    // Populate req with company context (same fields JWT middleware sets)
    req.companyId = apiKey.company_id
    req.adminEmail = `api_key:${apiKey.name}` // distinguishable from human sessions in audit logs
    ;(req as any).apiKeyScopes = apiKey.scopes.split(',').map((s: string) => s.trim())

    return next()
  } catch (err) {
    console.error('[apiKeyMiddleware] DB error during key lookup:', err)
    return res.status(500).json({ error: 'Internal auth error' })
  }
}
