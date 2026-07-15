import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/funnel
// Returns conversion funnel stages with counts and percentages
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const events = await prisma.event.groupBy({
      by: ['name'],
      where: { company_id: companyId },
      _count: { _all: true },
    })

    const countByName = new Map(
      events.map((e) => [e.name, e._count._all])
    )

    const visitors = countByName.get('visitor') ?? 0
    const signups = countByName.get('signup') ?? 0
    const activations = countByName.get('activation') ?? 0
    const trials = countByName.get('trial_started') ?? 0
    const paid = countByName.get('subscription_created') ?? 0

    const safePct = (n: number) => (visitors > 0 ? (n / visitors) * 100 : 0)

    return res.json({
      visitors,
      signups,
      activations,
      trials,
      paid,
      conversionRates: {
        signup: safePct(signups),
        activation: safePct(activations),
        trial: safePct(trials),
        paid: safePct(paid),
      },
    })
  } catch (error) {
    console.error('Funnel fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch funnel data' })
  }
})

export default router
