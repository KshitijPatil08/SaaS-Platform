import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { analyticsService } from './analytics.service'

const router = express.Router()

// GET /api/funnel — conversion funnel stages with counts and percentages
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const funnel = await analyticsService.getFunnel(companyId)
    return res.json(funnel)
  } catch (error) {
    console.error('Funnel fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch funnel data' })
  }
})

export default router
