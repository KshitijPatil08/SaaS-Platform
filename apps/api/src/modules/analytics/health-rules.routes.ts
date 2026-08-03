import express, { type Request, type Response } from 'express'
import { healthScoreService } from './health-score.service'
import { prisma } from '../shared/lib/prisma'

const router = express.Router()

interface HealthScoreConfig {
  paymentWeightPct: number
  accountAgeWeightPct: number
  eventActivityWeightPct: number
  mrrTrendWeightPct: number
}

const DEFAULT_RULES: HealthScoreConfig = {
  paymentWeightPct: 40,
  accountAgeWeightPct: 20,
  eventActivityWeightPct: 20,
  mrrTrendWeightPct: 20,
}

/**
 * Reads health score config from DB (persisted in Company.health_score_config JSON field).
 * Falls back to DEFAULT_RULES if not set or on parse error.
 * DB-persisted ensures rules survive restarts and are consistent across all API instances.
 */
async function getCompanyRules(companyId: string): Promise<HealthScoreConfig> {
  try {
    const company = await (prisma.company as any).findUnique({
      where: { id: companyId },
      select: { health_score_config: true },
    })
    if (!company?.health_score_config || company.health_score_config === '{}') {
      return DEFAULT_RULES
    }
    return { ...DEFAULT_RULES, ...JSON.parse(company.health_score_config as string) }
  } catch {
    return DEFAULT_RULES
  }
}

router.get('/rules', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const rules = await getCompanyRules(companyId)
  return res.json(rules)
})

router.put('/rules', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { paymentWeightPct, accountAgeWeightPct, eventActivityWeightPct, mrrTrendWeightPct } = req.body

  const total = (paymentWeightPct || 0) + (accountAgeWeightPct || 0) + (eventActivityWeightPct || 0) + (mrrTrendWeightPct || 0)
  if (total !== 100) {
    return res.status(400).json({ error: 'Signal weights must sum to exactly 100%' })
  }

  const updatedRules: HealthScoreConfig = {
    paymentWeightPct,
    accountAgeWeightPct,
    eventActivityWeightPct,
    mrrTrendWeightPct,
  }

  // Persist to DB — survives restarts, consistent across all API instances
  await (prisma.company as any).update({
    where: { id: companyId },
    data: { health_score_config: JSON.stringify(updatedRules) },
  })

  // Fire-and-forget: recompute scores with new weights immediately.
  // Don't await — HTTP response returns without waiting for potentially 100s of customers.
  setImmediate(() => {
    healthScoreService.recomputeAll(companyId).catch((err) => {
      console.error(`[health-rules] Background recompute failed for ${companyId}:`, err)
    })
  })

  return res.json({
    success: true,
    rules: updatedRules,
    message: 'Custom health score weights saved. Scores are being recomputed in the background.',
  })
})

export default router
