import type { Request, Response, NextFunction } from 'express'

export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'DEVELOPER'

/**
 * RBAC Role enforcement middleware.
 *
 * Reads the role directly from req.adminRole (populated by auth.middleware from the JWT payload).
 * This eliminates the O(1) DB query that was previously fired on every protected request.
 *
 * Role hierarchy: OWNER > ADMIN > ANALYST / DEVELOPER
 * OWNER always passes — they have full access to all operations.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminEmail = req.adminEmail
    const companyId = req.companyId

    if (!adminEmail || !companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Role is embedded in JWT and set by auth.middleware — no DB round-trip needed
    const userRole = (req.adminRole as UserRole) || 'ADMIN'

    // OWNER has access to everything
    if (userRole === 'OWNER' || allowedRoles.includes(userRole)) {
      return next()
    }

    return res.status(403).json({
      error: `Forbidden. Action requires one of the following roles: ${allowedRoles.join(', ')}`,
    })
  }
}

/**
 * API Key Scope enforcement middleware.
 *
 * When a request is authenticated via API key, the api-key.middleware
 * populates req.apiKeyScopes (comma-separated string of granted scopes).
 *
 * JWT-based admin sessions (browser) bypass scope checks — they have full access.
 *
 * Examples:
 *   requireScope('write:customers')   ← blocks read-only keys
 *   requireScope('read:analytics')    ← allows read keys, blocks revoked keys
 */
export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyScopes: string | undefined = (req as any).apiKeyScopes

    // JWT sessions (browser/admin) have no scope restriction
    if (!apiKeyScopes) return next()

    const grantedScopes = apiKeyScopes.split(',').map((s) => s.trim())

    if (!grantedScopes.includes(requiredScope)) {
      return res.status(403).json({
        error: 'Insufficient API key scope',
        required: requiredScope,
        granted: grantedScopes,
      })
    }

    return next()
  }
}
