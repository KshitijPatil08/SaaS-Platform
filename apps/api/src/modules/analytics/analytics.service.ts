import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'

// Shared aggregation helpers for the KPIs, funnel, and health endpoints.
export const analyticsService = {
  // Top-level KPI snapshot: MRR, active customer count, 30-day churn rate (cached for performance)
  async getKpis(companyId: string) {
    const cacheKey = `kpis_${companyId}`
    const cached = kpiCache.get<{ mrr_cents: number; customer_count: number; churn_rate: number }>(cacheKey)
    if (cached) return cached

    // Rolling 30-day window for churn
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - 30)

    const [activeCustomerCount, mrrSnapshot, churnCount] = await Promise.all([
      prisma.customer.count({
        where: {
          company_id: companyId,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
      }),
      prisma.mRRSnapshot.findFirst({
        where: { company_id: companyId },
        orderBy: { date: 'desc' },
      }),
      prisma.churnEvent.count({
        where: { company_id: companyId, churned_at: { gte: periodStart } },
      }),
    ])

    // Denominator for 30-day churn rate is the customer base at start of period
    const startingCustomerBase = activeCustomerCount + churnCount
    const churnRate =
      startingCustomerBase > 0
        ? Math.round((churnCount / startingCustomerBase) * 1000) / 10
        : 0

    const result = {
      mrr_cents: mrrSnapshot?.mrr_cents ?? 0,
      customer_count: activeCustomerCount,
      churn_rate: churnRate,
    }

    kpiCache.set(cacheKey, result, 60 * 1000) // 60s TTL
    return result
  },

  // Conversion funnel counts with unique customer de-duplication
  async getFunnel(companyId: string) {
    const events = await prisma.event.groupBy({
      by: ['name'],
      where: { company_id: companyId },
      _count: { _all: true },
    })

    // Query unique customer IDs per event stage
    const distinctEvents = await prisma.event.groupBy({
      by: ['name', 'customer_id'],
      where: { company_id: companyId, customer_id: { not: null } },
    })

    const distinctCountByName = new Map<string, number>()
    for (const item of distinctEvents) {
      distinctCountByName.set(item.name, (distinctCountByName.get(item.name) || 0) + 1)
    }

    const rawCountByName = new Map(events.map((e) => [e.name, e._count._all]))

    const visitors = rawCountByName.get('visitor') ?? 0
    const signups = distinctCountByName.get('signup') ?? rawCountByName.get('signup') ?? 0
    const activations = distinctCountByName.get('activation') ?? rawCountByName.get('activation') ?? 0
    const trials = distinctCountByName.get('trial_started') ?? rawCountByName.get('trial_started') ?? 0
    const paid = distinctCountByName.get('subscription_created') ?? rawCountByName.get('subscription_created') ?? 0

    const safePct = (n: number) => (visitors > 0 ? (n / visitors) * 100 : 0)

    return {
      visitors,
      signups,
      activations,
      trials,
      paid,
      conversionRates: {
        signup: safePct(signups),
        activation: safePct(activations),
        trial: safePct(trials),
        paid: safePct(paid),
      },
    }
  },

  // Health-score distribution + top at-risk accounts
  async getHealth(companyId: string) {
    // Fetch every health score for the company, newest first, in a SINGLE
    // query. Previously this did a groupBy + one findFirst PER customer
    // (N+1 queries). We dedupe to the latest score per customer in memory,
    // which is O(n) instead of O(n) queries and stays bounded by the
    // company's customer count.
    const all = await prisma.healthScore.findMany({
      where: { company_id: companyId },
      orderBy: { computed_at: 'desc' },
      include: { customer: { select: { name: true, email: true } } },
    })

    const seen = new Set<string>()
    const scores: Array<{
      customer_id: string
      score: number
      signals: unknown
      customer: { name: string; email: string }
    }> = []

    for (const row of all) {
      if (seen.has(row.customer_id)) continue
      seen.add(row.customer_id)
      scores.push({
        customer_id: row.customer_id,
        score: row.score,
        signals: row.signals,
        customer: row.customer as { name: string; email: string },
      })
    }

    const distribution = {
      healthy: scores.filter((s) => s.score >= 70).length,
      atRisk: scores.filter((s) => s.score >= 40 && s.score < 70).length,
      critical: scores.filter((s) => s.score < 40).length,
    }

    const topAtRisk = scores
      .filter((s) => s.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((s) => ({
        customer_id: s.customer_id,
        name: s.customer.name,
        email: s.customer.email,
        score: s.score,
        signals: s.signals,
      }))

    return { distribution, topAtRisk }
  },

  // Churn reason breakdown and total MRR lost
  async getChurnBreakdown(companyId: string) {
    const events = await prisma.churnEvent.groupBy({
      by: ['reason'],
      where: { company_id: companyId },
      _count: { _all: true },
      _sum: { mrr_lost_cents: true },
    })

    const totalLostCents = events.reduce((acc, e) => acc + (e._sum.mrr_lost_cents || 0), 0)

    const reasons = events.map((e) => ({
      reason: e.reason || 'unspecified',
      count: e._count._all,
      mrrLostCents: e._sum.mrr_lost_cents || 0,
      percentage: totalLostCents > 0 ? Math.round(((e._sum.mrr_lost_cents || 0) / totalLostCents) * 100) : 0,
    }))

    return { totalLostCents, reasons }
  },
}
