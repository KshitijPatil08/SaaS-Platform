/**
 * trial-expiry.routes.ts
 *
 * GET /api/analytics/trial-expiry
 *
 * Returns customers whose trials expire within 7 days (or already expired),
 * sorted by days remaining ascending. Used by the TrialExpiryWidget on Dashboard.
 *
 * Caches for 5 minutes — trial data doesn't need real-time accuracy.
 */
import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'

const router = express.Router()

export interface TrialExpiry {
  customerId: string
  name: string
  email: string
  mrrCents: number
  trialEndsAt: string
  daysLeft: number          // negative = already expired
  status: 'expiring_today' | 'expiring_soon' | 'expiring_week' | 'expired'
}

router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const cacheKey = `trial_expiry_${companyId}`
    const cached = kpiCache.get<TrialExpiry[]>(cacheKey)
    if (cached) return res.json(cached)

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Load trialing customers with trial_ends_at within the next 7 days or already past
    const customers = await prisma.customer.findMany({
      where: {
        company_id: companyId,
        status: 'trialing',
        trial_ends_at: {
          lte: sevenDaysFromNow,  // expiring within 7 days or already expired
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        mrr_cents: true,
        trial_ends_at: true,
      },
      orderBy: { trial_ends_at: 'asc' }, // soonest expiry first
    })

    const results: TrialExpiry[] = customers
      .filter(c => c.trial_ends_at !== null)
      .map(c => {
        const daysLeft = Math.ceil(
          (c.trial_ends_at!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        let status: TrialExpiry['status']
        if (daysLeft <= 0) status = 'expired'
        else if (daysLeft <= 1) status = 'expiring_today'
        else if (daysLeft <= 3) status = 'expiring_soon'
        else status = 'expiring_week'

        return {
          customerId: c.id,
          name: c.name,
          email: c.email,
          mrrCents: c.mrr_cents,
          trialEndsAt: c.trial_ends_at!.toISOString(),
          daysLeft,
          status,
        }
      })

    kpiCache.set(cacheKey, results, 5 * 60 * 1000) // 5 min TTL
    return res.json(results)
  } catch (error) {
    console.error('Trial expiry fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch trial expiry data' })
  }
})

export default router
