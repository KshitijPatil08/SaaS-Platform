import express from 'express'
import { z } from 'zod'
import { verifyJwt } from '../auth/auth.middleware'
import { validateQuery } from '../shared/middleware/validation'
import { accountsQuerySchema } from './accounts.schema'
import { accountsService } from './accounts.service'
import { auditService } from '../shared/lib/audit.service'

const router = express.Router()

// GET /api/accounts?page=1&pageSize=10&status=active&plan=pro&search=acme
// Returns paginated, filterable account list
router.get('/', verifyJwt, validateQuery(accountsQuerySchema), async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await accountsService.list(req.query as any, companyId)
    return res.json(result)
  } catch (error) {
    console.error('Accounts fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

// GET /api/accounts/:id
// Returns a single account by ID (scoped to the authenticated company)
router.get('/:id', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })
    const account = await accountsService.getById(req.params.id, companyId)
    if (!account) return res.status(404).json({ error: 'Account not found' })
    return res.json(account)
  } catch (error) {
    console.error('Account fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch account' })
  }
})

// GET /api/accounts/:id/events
// Returns recent activity events for a specific customer
router.get('/:id/events', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })
    const events = await accountsService.getEvents(req.params.id, companyId, 50)
    return res.json(events)
  } catch (error) {
    console.error('Account events fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch customer events' })
  }
})

// Zod schema for partial customer updates
const patchAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  plan: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).optional(),
  mrr_cents: z.number().int().min(0).max(100_000_000).optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
})

// PATCH /api/accounts/:id — partial update of a single customer field(s)
router.patch('/:id', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const parsed = patchAccountSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'No fields to update provided' })
    }

    const updated = await accountsService.updateById(req.params.id, companyId, parsed.data)
    if (!updated) return res.status(404).json({ error: 'Account not found' })

    // Audit every manual customer update
    await auditService.log({
      companyId,
      userEmail: req.adminEmail || 'admin',
      action: 'UPDATE_CUSTOMER',
      req,
      details: { customerId: req.params.id, changes: parsed.data },
    })

    return res.json(updated)
  } catch (error) {
    console.error('Account update error:', error)
    return res.status(500).json({ error: 'Failed to update account' })
  }
})

export default router
