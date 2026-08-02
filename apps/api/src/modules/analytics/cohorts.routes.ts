import express, { type Request, type Response } from 'express'
import { analyticsService } from './analytics.service'
import { predictiveChurnService } from './predictive-churn.service'

const router = express.Router()

router.get('/cohorts', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const data = await analyticsService.getCohorts(companyId)
    return res.json(data)
  } catch (err) {
    console.error('[cohorts] Error:', err)
    return res.status(500).json({ error: 'Failed to fetch cohort retention data' })
  }
})

router.get('/predictive-churn', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const data = await predictiveChurnService.getPredictiveChurnRisk(companyId)
    return res.json(data)
  } catch (err) {
    console.error('[predictive-churn] Error:', err)
    return res.status(500).json({ error: 'Failed to fetch predictive churn risk data' })
  }
})

export default router
