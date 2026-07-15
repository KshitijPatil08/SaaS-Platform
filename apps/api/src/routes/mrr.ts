import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/mrr?range=last_12_months
// Returns MRR time series for charting
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const snapshots = await prisma.mRRSnapshot.findMany({
      where: { company_id: companyId },
      orderBy: { date: 'asc' },
      take: 12,
    })

    const series = snapshots.map((s) => ({
      date: s.date,
      mrr: s.mrr_cents,
      newMrr: s.new_mrr_cents,
      churnedMrr: s.churned_mrr_cents,
    }))

    return res.json(series)
  } catch (error) {
    console.error('MRR fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch MRR data' })
  }
})

export default router
