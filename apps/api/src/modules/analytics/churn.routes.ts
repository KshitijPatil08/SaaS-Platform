import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { analyticsService } from './analytics.service'

const router = express.Router()

async function handleChurnBreakdown(req: express.Request, res: express.Response) {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const breakdown = await analyticsService.getChurnBreakdown(companyId)
    return res.json(breakdown)
  } catch (error) {
    console.error('Churn fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch churn breakdown' })
  }
}

// GET /api/churn — Returns churn reason breakdown and lost MRR metrics
router.get('/', verifyJwt, handleChurnBreakdown)

// GET /api/churn/breakdown — Alias used by the frontend useChurnBreakdown() hook
// The frontend calls /api/churn/breakdown; this route prevents the 404.
router.get('/breakdown', verifyJwt, handleChurnBreakdown)

export default router
