import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'

export interface PredictiveRiskAccount {
  customerId: string
  name: string
  email: string
  mrrCents: number
  riskScorePct: number
  horizon: 'Low Risk' | 'Medium Risk' | 'Critical Risk'
  primaryRiskFactor: string
  recommendedAction: string
}

export const predictiveChurnService = {
  async getPredictiveChurnRisk(companyId: string) {
    const cacheKey = `predictive_churn_${companyId}`
    const cached = kpiCache.get<any>(cacheKey)
    if (cached) return cached

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Load customers + their latest health score + last event timestamp
    // in a single efficient query via Prisma relations.
    // O(K) where K = active/at-risk customer count.
    const customers = await prisma.customer.findMany({
      where: {
        company_id: companyId,
        status: { in: ['active', 'past_due', 'trialing'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        mrr_cents: true,
        created_at: true,
        trial_ends_at: true,
        // Latest event: used for real activity decay scoring
        events: {
          orderBy: { occurred_at: 'desc' },
          take: 1,
          select: { occurred_at: true },
        },
        // Latest health score: compounds our signal accuracy
        health_scores: {
          orderBy: { computed_at: 'desc' },
          take: 1,
          select: { score: true },
        },
      },
    })

    // Compute real 30-day churn rate denominator from actual churn history
    const [recentChurnCount, startingBase] = await Promise.all([
      prisma.churnEvent.count({
        where: { company_id: companyId, churned_at: { gte: thirtyDaysAgo } },
      }),
      prisma.customer.count({
        where: { company_id: companyId, status: { in: ['active', 'trialing', 'past_due', 'canceled'] } },
      }),
    ])

    const now = Date.now()
    const atRiskAccounts: PredictiveRiskAccount[] = []
    let totalAtRiskMrrCents = 0

    for (const c of customers) {
      let riskScore = 10 // conservative baseline

      // ── Signal 1: Payment Status ─────────────────────────────────────────────
      if (c.status === 'past_due') {
        riskScore += 55   // payment failure is strongest churn predictor
      } else if (c.status === 'trialing') {
        // Trial expiry proximity
        if (c.trial_ends_at) {
          const daysLeft = Math.ceil((new Date(c.trial_ends_at).getTime() - now) / 86_400_000)
          if (daysLeft <= 3) riskScore += 35
          else if (daysLeft <= 7) riskScore += 20
          else riskScore += 10
        } else {
          riskScore += 20
        }
      }

      // ── Signal 2: Real Activity Decay (days since last event) ────────────────
      const lastEventDate = c.events[0]
        ? new Date(c.events[0].occurred_at)
        : new Date(c.created_at)
      const daysInactive = Math.floor((now - lastEventDate.getTime()) / 86_400_000)

      if (daysInactive > 30) riskScore += 30
      else if (daysInactive > 14) riskScore += 18
      else if (daysInactive > 7) riskScore += 8
      else if (daysInactive <= 3) riskScore -= 5  // recently active reduces risk

      // ── Signal 3: Health Score Compound (if available) ──────────────────────
      const latestHealth = c.health_scores[0]?.score
      if (latestHealth !== undefined) {
        if (latestHealth < 40) riskScore += 20
        else if (latestHealth < 70) riskScore += 8
        else riskScore -= 8  // healthy customers get risk reduction
      }

      // ── Signal 4: Account Age (new accounts churn faster) ───────────────────
      const ageDays = Math.floor((now - new Date(c.created_at).getTime()) / 86_400_000)
      if (ageDays < 14) riskScore += 12
      else if (ageDays < 30) riskScore += 6

      // Clamp to [5, 98] — never show 0% or 100% (epistemic humility)
      const finalRiskScore = Math.min(98, Math.max(5, Math.round(riskScore)))

      // ── Horizon & Action Classification ─────────────────────────────────────
      let horizon: PredictiveRiskAccount['horizon'] = 'Low Risk'
      let primaryRiskFactor = 'Stable usage trajectory'
      let recommendedAction = 'Maintain standard quarterly check-in schedule'

      if (finalRiskScore >= 70) {
        horizon = 'Critical Risk'
        if (c.status === 'past_due') {
          primaryRiskFactor = 'Failed billing attempt — invoice overdue'
          recommendedAction = 'Immediate personal outreach + offer flexible payment plan'
        } else if (daysInactive > 30) {
          primaryRiskFactor = `${daysInactive} days of zero product activity`
          recommendedAction = 'Send re-engagement campaign with feature value recap'
        } else {
          primaryRiskFactor = 'Trial expiring without conversion signals'
          recommendedAction = 'Book product demo + offer extended trial or discount'
        }
        totalAtRiskMrrCents += c.mrr_cents
      } else if (finalRiskScore >= 40) {
        horizon = 'Medium Risk'
        if (daysInactive > 14) {
          primaryRiskFactor = `${daysInactive} days of low product engagement`
          recommendedAction = 'Send automated check-in email with usage tips'
        } else if (c.status === 'trialing') {
          primaryRiskFactor = 'Trial conversion window closing'
          recommendedAction = 'Schedule product onboarding call to demonstrate core value'
        } else {
          primaryRiskFactor = 'Below-average health score trend'
          recommendedAction = 'Assign to Customer Success manager for proactive review'
        }
      }

      if (finalRiskScore >= 40) {
        atRiskAccounts.push({
          customerId: c.id,
          name: c.name,
          email: c.email,
          mrrCents: c.mrr_cents,
          riskScorePct: finalRiskScore,
          horizon,
          primaryRiskFactor,
          recommendedAction,
        })
      }
    }

    // Sort by risk score descending — highest risk customers first
    atRiskAccounts.sort((a, b) => b.riskScorePct - a.riskScorePct)

    // Real forecasted churn rate from actual churn history
    const realChurnRatePct = startingBase > 0
      ? Math.round((recentChurnCount / startingBase) * 1000) / 10
      : 0

    const result = {
      forecastedChurnRatePct: realChurnRatePct,
      atRiskAccountCount: atRiskAccounts.length,
      totalAtRiskMrrCents,
      accounts: atRiskAccounts.slice(0, 10), // Return top 10 highest-risk
    }

    kpiCache.set(cacheKey, result, 120 * 1000) // 2 min TTL
    return result
  },
}
