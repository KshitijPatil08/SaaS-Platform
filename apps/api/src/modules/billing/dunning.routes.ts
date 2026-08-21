import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

// ─── GET /api/dunning/summary ───────────────────────────────────────────────

router.get('/summary', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const pastDueCustomers = await prisma.customer.findMany({
      where: { company_id: companyId, status: 'past_due' },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        mrr_cents: true,
        status: true,
        created_at: true,
      },
      orderBy: { mrr_cents: 'desc' },
    })

    const pastDueMrrCents = pastDueCustomers.reduce((acc, c) => acc + c.mrr_cents, 0)

    // Real recovery tracking: find customers who had a payment_failed event (past_due)
    // but are now active — meaning they recovered within the last 30 days.
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Count customers with a past_due→active recovery event in the last 30 days
    // We approximate this by looking at customers currently active who had
    // a payment_failed event in the recent window.
    const recentRecoveries = await prisma.event.findMany({
      where: {
        company_id: companyId,
        name: 'payment_recovered',
        occurred_at: { gte: thirtyDaysAgo },
      },
      include: {
        customer: { select: { mrr_cents: true, status: true } },
      },
    })

    const recoveredMrrCents = recentRecoveries.reduce(
      (acc, e) => acc + (e.customer?.mrr_cents ?? 0),
      0
    )

    // Recovery rate: recovered / (recovered + still past_due)
    const totalDunned = recentRecoveries.length + pastDueCustomers.length
    const recoveryRatePct = totalDunned > 0
      ? Math.round((recentRecoveries.length / totalDunned) * 1000) / 10
      : pastDueCustomers.length === 0 ? 100 : 0

    return res.json({
      pastDueCount: pastDueCustomers.length,
      pastDueMrrCents,
      recoveredMrrCents,
      recoveryRatePct,
      recoveredCount: recentRecoveries.length,
      accounts: pastDueCustomers,
    })
  } catch (err) {
    console.error('[dunning] Error fetching dunning summary:', err)

    return res.status(500).json({ error: 'Failed to fetch dunning summary' })
  }
})

// ─── POST /api/dunning/recover ──────────────────────────────────────────────
// Fix #20: requireRole — ANALYST must not be able to manually recover payments
// and corrupt the dunning audit trail with unauthorized status changes.
router.post('/recover', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { customerId } = req.body as { customerId: string }

  if (!companyId || !customerId) {
    return res.status(400).json({ error: 'Company ID and Customer ID are required' })
  }

  try {
    const updated = await prisma.customer.update({
      where: { id: customerId, company_id: companyId },
      data: { status: 'active' },
    })

    // Emit payment_recovered event for real dunning recovery tracking
    await prisma.event.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        name: 'payment_recovered',
        occurred_at: new Date(),
        properties: JSON.stringify({ method: 'manual_recovery', mrr_cents: updated.mrr_cents }),
      },
    })

    // Insert health score recovery event
    await prisma.healthScore.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        score: 85,
        signals: JSON.stringify({ payment_status: 'recovered', mrr_trend: 'stable' }),
      },
    })

    // Correctly invalidate the KPI cache key so the next request recomputes from DB
    kpiCache.invalidate(`kpis_${companyId}`)

    return res.json({
      success: true,
      message: `Payment successfully recovered for ${updated.name}! Subscription restored to Active.`,
      customer: updated,
    })
  } catch (err) {
    console.error('[dunning] Error recovering payment:', err)
    return res.status(500).json({ error: 'Failed to execute payment recovery' })
  }
})

export default router
