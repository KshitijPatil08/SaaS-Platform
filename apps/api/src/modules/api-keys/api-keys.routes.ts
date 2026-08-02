import express, { type Request, type Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ─── GET /api/api-keys ───────────────────────────────────────────────────────

router.get('/', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const keys = await (prisma as any).apiKey.findMany({
      where: { company_id: companyId, revoked_at: null },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        scopes: true,
        last_used_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return res.json(keys)
  } catch (err) {
    console.error('[api-keys] Error listing keys:', err)
    return res.status(500).json({ error: 'Failed to fetch API keys' })
  }
})

// ─── POST /api/api-keys ──────────────────────────────────────────────────────

router.post('/', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { name, scopes } = req.body as { name: string; scopes?: string[] }

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Key name is required' })
  }

  try {
    const randomHex = crypto.randomBytes(16).toString('hex')
    const fullKey = `pulse_live_${randomHex}`
    const prefix = `pulse_live_${randomHex.slice(0, 6)}...`
    const hashedKey = hashApiKey(fullKey)

    const scopeStr = Array.isArray(scopes) && scopes.length > 0
      ? scopes.join(',')
      : 'read:analytics'

    const apiKeyRecord = await (prisma as any).apiKey.create({
      data: {
        company_id: companyId,
        name: name.trim(),
        key_prefix: prefix,
        hashed_key: hashedKey,
        scopes: scopeStr,
      },
    })

    return res.status(201).json({
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      fullKey,
      prefix,
      scopes: scopeStr,
      createdAt: apiKeyRecord.created_at,
    })
  } catch (err) {
    console.error('[api-keys] Error creating key:', err)
    return res.status(500).json({ error: 'Failed to generate API key' })
  }
})

// ─── DELETE /api/api-keys/:id ────────────────────────────────────────────────

router.delete('/:id', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { id } = req.params

  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await (prisma as any).apiKey.updateMany({
      where: { id, company_id: companyId },
      data: { revoked_at: new Date() },
    })

    return res.json({ success: true, message: 'API key revoked successfully' })
  } catch (err) {
    console.error('[api-keys] Error revoking key:', err)
    return res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

export default router
