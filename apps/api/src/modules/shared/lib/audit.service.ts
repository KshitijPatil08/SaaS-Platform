import { Request } from 'express'
import { prisma } from './prisma'

export interface LogAuditParams {
  companyId: string
  userEmail: string
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'EXPORT_DATA' | 'UPDATE_PROFILE' | 'ENROLL_MFA' | 'CONFIRM_MFA' | 'RESET_LOCKOUT'
  req?: Request
  details?: Record<string, any>
}

export const auditService = {
  async log(params: LogAuditParams) {
    try {
      const ip = params.req
        ? (params.req.headers['x-forwarded-for'] as string)?.split(',')[0] || params.req.ip || '127.0.0.1'
        : '127.0.0.1'
      const userAgent = params.req ? params.req.headers['user-agent'] || 'unknown' : 'unknown'

      return await prisma.auditLog.create({
        data: {
          company_id: params.companyId,
          user_email: params.userEmail,
          action: params.action,
          ip_address: ip,
          user_agent: userAgent,
          details: JSON.stringify(params.details || {}),
        },
      })
    } catch (err) {
      console.error('[auditService] Failed to record audit log:', err)
    }
  },

  async getLogs(companyId: string, limit = 50) {
    const logs = await prisma.auditLog.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: limit,
    })
    return logs.map((l) => ({
      id: l.id,
      email: l.user_email,
      action: l.action,
      ip: l.ip_address,
      userAgent: l.user_agent,
      details: l.details,
      createdAt: l.created_at,
    }))
  },
}
