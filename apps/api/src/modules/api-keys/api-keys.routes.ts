import express, { type Request, type Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'
import { validateBody } from '../shared/middleware/validation'

// Fix #14: Explicit scope allow-list — prevents arbitrary strings being stored and misread
const ALLOWED_SCOPES = ['read:analytics', 'write:customers', 'read:export', 'write:webhooks'] as const

// Fix H-4: Validate name is present and a non-empty string before calling .trim()
// (missing name was a TypeError crash — 500 response with no body).
const createApiKeySchema = z.object({
  name:   z.string({ required_error: 'name is required' }).trim().min(1, 'name cannot be empty').max(100, 'name must be 100 characters or less'),
  scopes: z.array(z.string()).optional(),
})

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

router.post('/', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), validateBody(createApiKeySchema), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { name, scopes } = req.body as z.infer<typeof createApiKeySchema>

  try {
    const randomHex = crypto.randomBytes(16).toString('hex')
    const fullKey = `pulse_live_${randomHex}`
    const prefix = `pulse_live_${randomHex.slice(0, 6)}...`
    const hashedKey = hashApiKey(fullKey)

    // Fix #14: Only store scopes that exist in the allow-list; unknown scopes are silently dropped
    const rawScopes = Array.isArray(scopes) ? scopes : []
    const validScopes = rawScopes.filter((s) => (ALLOWED_SCOPES as readonly string[]).includes(s))
    const scopeStr = validScopes.length > 0 ? validScopes.join(',') : 'read:analytics'

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
