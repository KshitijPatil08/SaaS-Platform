import express, { type Request, type Response } from 'express'

const router = express.Router()

// In-memory or tenant rule configuration
const DEFAULT_RULES = {
  paymentWeightPct: 40,
  accountAgeWeightPct: 20,
  eventActivityWeightPct: 20,
  mrrTrendWeightPct: 20,
}

const companyRules = new Map<string, typeof DEFAULT_RULES>()

router.get('/rules', (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const rules = companyRules.get(companyId) || DEFAULT_RULES
  return res.json(rules)
})

router.put('/rules', (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { paymentWeightPct, accountAgeWeightPct, eventActivityWeightPct, mrrTrendWeightPct } = req.body

  const total = (paymentWeightPct || 0) + (accountAgeWeightPct || 0) + (eventActivityWeightPct || 0) + (mrrTrendWeightPct || 0)
  if (total !== 100) {
    return res.status(400).json({ error: 'Signal weights must sum to exactly 100%' })
  }

  const updatedRules = {
    paymentWeightPct,
    accountAgeWeightPct,
    eventActivityWeightPct,
    mrrTrendWeightPct,
  }

  companyRules.set(companyId, updatedRules)
  return res.json({ success: true, rules: updatedRules, message: 'Custom health score weights saved successfully!' })
})

export default router
