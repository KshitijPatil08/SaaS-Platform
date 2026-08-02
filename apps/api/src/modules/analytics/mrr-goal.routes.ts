import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

// GET /api/mrr-goal — fetch current company goal
router.get('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const goal = await (prisma as any).mrrGoal.findUnique({
    where: { company_id: companyId },
  })

  // Also fetch current MRR so the frontend can compute % progress
  const customers = await prisma.customer.aggregate({
    where: { company_id: companyId, status: { in: ['active', 'trialing'] } },
    _sum: { mrr_cents: true },
  })

  const currentMrrCents = customers._sum.mrr_cents ?? 0

  return res.json({
    goal: goal ?? null,
    currentMrrCents,
    progressPct: goal
      ? Math.min(100, Math.round((currentMrrCents / goal.target_mrr_cents) * 100))
      : null,
  })
})

// PUT /api/mrr-goal — upsert goal (Owner/Admin only)
router.put('/', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { label, target_mrr_cents, target_date } = req.body

  if (!target_mrr_cents || !target_date) {
    return res.status(400).json({ error: 'target_mrr_cents and target_date are required' })
  }

  const goal = await (prisma as any).mrrGoal.upsert({
    where: { company_id: companyId },
    create: {
      company_id: companyId,
      label: label || 'MRR Target',
      target_mrr_cents: Number(target_mrr_cents),
      target_date: new Date(target_date),
    },
    update: {
      label: label || 'MRR Target',
      target_mrr_cents: Number(target_mrr_cents),
      target_date: new Date(target_date),
    },
  })

  return res.json({ success: true, goal })
})

export default router
