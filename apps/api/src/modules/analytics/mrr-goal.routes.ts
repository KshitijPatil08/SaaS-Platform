import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'
import { kpiCache } from '../shared/lib/kpi-cache'

const router = express.Router()

const mrrGoalSchema = z.object({
  label: z.string().max(100).optional(),
  target_mrr_cents: z
    .number({ required_error: 'target_mrr_cents is required', invalid_type_error: 'target_mrr_cents must be a number' })
    .int('target_mrr_cents must be an integer')
    .positive('target_mrr_cents must be greater than 0')
    .max(100_000_000_00, 'target_mrr_cents exceeds maximum allowed value'), // $1B cap
  target_date: z
    .string({ required_error: 'target_date is required' })
    .refine((s) => !isNaN(Date.parse(s)), { message: 'target_date must be a valid ISO date string' }),
})

// GET /api/mrr-goal — fetch current company goal
// Fix #17: Cache for 60s — avoids a live aggregate SQL query on every dashboard render
router.get('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const cacheKey = `mrr_goal_${companyId}`
  const cached = kpiCache.get(cacheKey)
  if (cached) return res.json(cached)

  const goal = await (prisma as any).mrrGoal.findUnique({
    where: { company_id: companyId },
  })

  const customers = await prisma.customer.aggregate({
    where: { company_id: companyId, status: { in: ['active', 'trialing'] } },
    _sum: { mrr_cents: true },
  })

  const currentMrrCents = customers._sum.mrr_cents ?? 0

  const result = {
    goal: goal ?? null,
    currentMrrCents,
    progressPct: goal
      ? Math.min(100, Math.round((currentMrrCents / goal.target_mrr_cents) * 100))
      : null,
  }

  kpiCache.set(cacheKey, result, 60_000) // 1-minute TTL
  return res.json(result)
})

// PUT /api/mrr-goal — upsert goal (Owner/Admin only)
router.put('/', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const parsed = mrrGoalSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
  }

  const { label, target_mrr_cents, target_date } = parsed.data

  const goal = await (prisma as any).mrrGoal.upsert({
    where: { company_id: companyId },
    create: {
      company_id: companyId,
      label: label ?? 'MRR Target',
      target_mrr_cents,
      target_date: new Date(target_date),
    },
    update: {
      label: label ?? 'MRR Target',
      target_mrr_cents,
      target_date: new Date(target_date),
    },
  })

  return res.json({ success: true, goal })
})

export default router

