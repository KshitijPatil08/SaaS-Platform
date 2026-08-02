import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { analyticsService } from './analytics.service'

const router = express.Router()

// GET /api/churn
// Returns churn reason breakdown and lost MRR metrics
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const breakdown = await analyticsService.getChurnBreakdown(companyId)
    return res.json(breakdown)
  } catch (error) {
    console.error('Churn fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch churn breakdown' })
  }
})

export default router
