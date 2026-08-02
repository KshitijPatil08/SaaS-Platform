import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../shared/lib/prisma'

export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'DEVELOPER'

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const adminEmail = req.adminEmail
    const companyId = req.companyId

    if (!adminEmail || !companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const admin: any = await prisma.adminUser.findFirst({
        where: { company_id: companyId, email: adminEmail },
        select: { id: true, email: true, role: true } as any,
      })

      const userRole = (admin?.role as UserRole) || 'ADMIN'

      // OWNER has access to everything
      if (userRole === 'OWNER' || allowedRoles.includes(userRole)) {
        return next()
      }

      return res.status(403).json({
        error: `Forbidden. Action requires one of the following roles: ${allowedRoles.join(', ')}`,
      })
    } catch (err) {
      console.error('[rbac] Error verifying role:', err)
      return res.status(500).json({ error: 'Internal server error checking user permissions' })
    }
  }
}
