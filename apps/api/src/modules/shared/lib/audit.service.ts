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
        const xForwardedFor = params.req.headers['x-forwarded-for']
        if (typeof xForwardedFor === 'string') {
          ip = xForwardedFor.split(',')[0].trim()
        } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
          ip = xForwardedFor[0].trim()
        } else if (params.req.ip) {
          ip = params.req.ip
        } else if (params.req.socket?.remoteAddress) {
          ip = params.req.socket.remoteAddress
        }

        const agentHeader = params.req.headers['user-agent']
        if (typeof agentHeader === 'string') {
          userAgent = agentHeader
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
