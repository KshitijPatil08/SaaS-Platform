/**
 * audit.service.test.ts
 *
 * Smoke-tests for the audit log service helper.
 * Uses a mocked Prisma client — no real DB connection needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mock prisma before importing the service ──────────────────────────────────
vi.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'log-1',
          user_email: 'admin@acme.com',
          action: 'LOGIN_SUCCESS',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0',
          details: '{}',
          created_at: new Date('2024-01-01'),
        },
      ]),
    },
  },
}))

import { auditService } from './audit.service'
import { prisma } from '../lib/prisma'

const mockReq = {
  ip: '127.0.0.1',
  headers: { 'user-agent': 'vitest-agent' },
} as any

describe('auditService.log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls prisma.auditLog.create with correct fields', async () => {
    await auditService.log({
      companyId: 'company-abc',
      userEmail: 'admin@acme.com',
      action: 'LOGIN_SUCCESS',
      req: mockReq,
    })

    expect(prisma.auditLog.create).toHaveBeenCalledOnce()
    const call = vi.mocked(prisma.auditLog.create).mock.calls[0][0]
    expect(call.data).toMatchObject({
      company_id: 'company-abc',
      user_email: 'admin@acme.com',
      action: 'LOGIN_SUCCESS',
      ip_address: '127.0.0.1',
    })
  })

  it('includes details when provided', async () => {
    await auditService.log({
      companyId: 'company-abc',
      userEmail: 'admin@acme.com',
      action: 'EXPORT_DATA',
      req: mockReq,
      details: { format: 'csv', rows: 200 },
    })

    const call = vi.mocked(prisma.auditLog.create).mock.calls[0][0]
    const details = JSON.parse(call.data.details)
    expect(details.format).toBe('csv')
    expect(details.rows).toBe(200)
  })

  it('does not throw when prisma.create fails (non-critical)', async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(new Error('DB timeout'))
    // Should not throw — audit logging must never crash a request
    await expect(
      auditService.log({
        companyId: 'company-abc',
        userEmail: 'admin@acme.com',
        action: 'LOGIN_FAILED',
        req: mockReq,
      })
    ).resolves.not.toThrow()
  })
})

describe('auditService.getLogs', () => {
  it('returns logs for a company', async () => {
    const logs = await auditService.getLogs('company-abc')
    expect(logs).toHaveLength(1)
    expect(logs[0].email).toBe('admin@acme.com')
    expect(logs[0].action).toBe('LOGIN_SUCCESS')
  })
})
