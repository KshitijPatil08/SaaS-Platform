import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { analyticsService } from './analytics.service'

const router = express.Router()

// GET /api/health — customer health score distribution + top at-risk accounts
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const health = await analyticsService.getHealth(companyId)
    return res.json(health)
  } catch (error) {
    console.error('Health fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch health data' })
  }
})

export default router
