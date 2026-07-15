import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/health
// Returns customer health score distribution + top at-risk accounts
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const latest = await prisma.healthScore.groupBy({
      by: ['customer_id'],
      where: { company_id: companyId },
      _max: { computed_at: true },
    })

    const latestScores = await Promise.all(
      latest.map((g) =>
        prisma.healthScore.findFirst({
          where: {
            company_id: companyId,
            customer_id: g.customer_id,
            computed_at: g._max.computed_at ?? undefined,
          },
          include: { customer: { select: { name: true, email: true } } },
        })
      )
    )

    const scores = latestScores.filter(Boolean) as Array<{
      customer_id: string
      score: number
      signals: unknown
      customer: { name: string; email: string }
    }>

    const distribution = {
      healthy: scores.filter((s) => s.score >= 70).length,
      atRisk: scores.filter((s) => s.score >= 40 && s.score < 70).length,
      critical: scores.filter((s) => s.score < 40).length,
    }

    const topAtRisk = scores
      .filter((s) => s.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((s) => ({
        customer_id: s.customer_id,
        name: s.customer.name,
        email: s.customer.email,
        score: s.score,
        signals: s.signals,
      }))

    return res.json({ distribution, topAtRisk })
  } catch (error) {
    console.error('Health fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch health data' })
  }
})

export default router
