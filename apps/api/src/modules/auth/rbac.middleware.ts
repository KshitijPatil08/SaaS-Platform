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
