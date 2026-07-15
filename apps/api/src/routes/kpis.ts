import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/kpis
// Returns: MRR, customer count, churn rate
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const [customerCount, mrrSnapshot, churnCount] = await Promise.all([
      prisma.customer.count({ where: { company_id: companyId } }),
      prisma.mRRSnapshot.findFirst({
        where: { company_id: companyId },
        orderBy: { date: 'desc' },
      }),
      prisma.churnEvent.count({ where: { company_id: companyId } }),
    ])

    const churnRate = customerCount > 0 ? (churnCount / customerCount) * 100 : 0

    return res.json({
      mrr_cents: mrrSnapshot?.mrr_cents ?? 0,
      customer_count: customerCount,
      churn_rate: churnRate,
    })
  } catch (error) {
    console.error('KPI fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch KPIs' })
  }
})

export default router
