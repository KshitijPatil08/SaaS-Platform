import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { analyticsService } from './analytics.service'

const router = express.Router()

// GET /api/kpis — MRR, customer count, churn rate
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const kpis = await analyticsService.getKpis(companyId)
    return res.json(kpis)
  } catch (error) {
    console.error('KPI fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch KPIs' })
  }
})

export default router
