import { Request } from 'express'
import { prisma } from './prisma'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'EXPORT_DATA'
  | 'UPDATE_PROFILE'
  | 'ENROLL_MFA'
  | 'CONFIRM_MFA'
  | 'RESET_LOCKOUT'
  | (string & {})

export interface LogAuditParams {
  companyId: string
  userEmail: string
  action: AuditAction
  req?: Request
  details?: Record<string, any>
}

export interface AuditLogRecord {
  id: string
  company_id: string
  user_email: string
  action: string
  ip_address: string | null
  user_agent: string | null
  details: string
  created_at: Date
}

export const auditService = {
  async log(params: LogAuditParams) {
    try {
      let ip = '127.0.0.1'
      let userAgent = 'unknown'

      if (params.req) {
        // Fix L-4: trust proxy:1 already makes req.ip the correct client IP after one hop.
        // Reading X-Forwarded-For manually bypasses that sanitization.
        ip = params.req.ip || params.req.socket?.remoteAddress || '127.0.0.1'

        // Fix H-1: Truncate User-Agent and strip log-injection characters (\n, \r, \0).
        // An attacker sending a 1 MB User-Agent on every login floods the audit log table.
        // Newlines in the UA would pollute structured log exports / SIEM forwarding.
        const rawAgent = params.req.headers['user-agent']
        if (typeof rawAgent === 'string') {
          userAgent = rawAgent.slice(0, 512).replace(/[\n\r\0]/g, ' ')
        }
      }

      const client = prisma as any
      return await client.auditLog.create({
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

  async getLogs(companyId: string, limit = 50, page = 1) {
    const client = prisma as any
    const skip = (page - 1) * limit
    const [logs, total]: [AuditLogRecord[], number] = await Promise.all([
      client.auditLog.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      client.auditLog.count({ where: { company_id: companyId } }),
    ])
    return {
      logs: logs.map((l: AuditLogRecord) => ({
        id: l.id,
        email: l.user_email,
        action: l.action,
        ip: l.ip_address || '127.0.0.1',
        userAgent: l.user_agent || 'unknown',
        details: l.details,
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },
}
