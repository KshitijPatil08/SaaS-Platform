import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { billingService } from './billing.service'

const router = express.Router()

// GET /api/mrr?range=last_12_months — MRR time series for charting
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const series = await billingService.getMrrSeries(companyId)
    return res.json(series)
  } catch (error) {
    console.error('MRR fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch MRR data' })
  }
})

export default router
