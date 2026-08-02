import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'

// Shared aggregation helpers for the KPIs, funnel, health, and cohorts endpoints.
export const analyticsService = {
  // Top-level KPI snapshot: MRR, active customer count, 30-day churn rate, ARPU, LTV, Quick Ratio
  async getKpis(companyId: string) {
    const cacheKey = `kpis_${companyId}`
    const cached = kpiCache.get<{
      mrr_cents: number
      customer_count: number
      churn_rate: number
      arpu_cents: number
      ltv_cents: number
      quick_ratio: number
    }>(cacheKey)
    if (cached) return cached

    // Rolling 30-day window for churn
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - 30)

    const [activeCustomerCount, mrrSnapshot, churnCount, mrrSeries] = await Promise.all([
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
      prisma.mRRSnapshot.findMany({
        where: { company_id: companyId },
        orderBy: { date: 'desc' },
        take: 2,
      }),
    ])

    const mrrCents = mrrSnapshot?.mrr_cents ?? 0

    // Denominator for 30-day churn rate is customer base at start of period
    const startingCustomerBase = activeCustomerCount + churnCount
    const churnRate =
      startingCustomerBase > 0
        ? Math.round((churnCount / startingCustomerBase) * 1000) / 10
        : 0

    // ARPU (Average Revenue Per User)
    const arpuCents = activeCustomerCount > 0 ? Math.round(mrrCents / activeCustomerCount) : 0

    // LTV (Lifetime Value) = ARPU / Monthly Churn Rate (bounded safely)
    const monthlyChurnDecimal = Math.max(0.01, churnRate / 100)
    const ltvCents = Math.round(arpuCents / monthlyChurnDecimal)

    // Quick Ratio = (New MRR) / (Churned MRR) from recent snapshots
    const latestSnapshot = mrrSeries[0]
    const newMrrCents = latestSnapshot?.new_mrr_cents ?? 0
    const churnedMrrCents = latestSnapshot?.churned_mrr_cents ?? 0
    const quickRatio = churnedMrrCents > 0
      ? Math.round((newMrrCents / churnedMrrCents) * 10) / 10
      : newMrrCents > 0 ? 4.0 : 1.0

    const result = {
      mrr_cents: mrrCents,
      customer_count: activeCustomerCount,
      churn_rate: churnRate,
      arpu_cents: arpuCents,
      ltv_cents: ltvCents,
      quick_ratio: quickRatio,
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

  // Cohort retention matrix: groups customer signups by month and tracks REAL retention
  // using their last-seen Event timestamp. O(n) two-pass algorithm — no Math.random().
  async getCohorts(companyId: string) {
    const cacheKey = `cohorts_${companyId}`
    const cached = kpiCache.get<any>(cacheKey)
    if (cached) return cached

    // Pass 1: load all customers with their signup month
    const customers = await prisma.customer.findMany({
      where: { company_id: companyId },
      select: { id: true, created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    })

    // Pass 2: load the latest event timestamp per customer in a single query
    // groupBy customer_id → max occurred_at gives us "last active month"
    const lastEvents = await prisma.event.groupBy({
      by: ['customer_id'],
      where: { company_id: companyId, customer_id: { not: null } },
      _max: { occurred_at: true },
    })

    // Build lookup: customerId → last active month key (YYYY-MM)
    const lastActiveMonth = new Map<string, string>()
    for (const row of lastEvents) {
      if (row.customer_id && row._max.occurred_at) {
        lastActiveMonth.set(
          row.customer_id,
          new Date(row._max.occurred_at).toISOString().slice(0, 7)
        )
      }
    }

    // Build cohort month grid for the last 6 months
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.toISOString().slice(0, 7))
    }

    // Cohort map: month → list of customer ids that signed up that month
    const cohortMap = new Map<string, string[]>()
    for (const c of customers) {
      const monthKey = new Date(c.created_at).toISOString().slice(0, 7)
      if (!cohortMap.has(monthKey)) cohortMap.set(monthKey, [])
      cohortMap.get(monthKey)!.push(c.id)
    }

    // For each cohort month, compute real retention at M+0..M+5
    // A customer is "retained" at M+N if their lastActiveMonth >= cohortMonth + N months
    const grid = months.map((cohortMonth) => {
      const members = cohortMap.get(cohortMonth) ?? []
      const total = members.length

      // Parse cohort base date
      const [cy, cm] = cohortMonth.split('-').map(Number)

      const retention = Array.from({ length: 6 }, (_, offset) => {
        if (total === 0) return 0
        if (offset === 0) return 100 // M0 is always 100%

        // Compute threshold month: cohortMonth + offset months
        const threshDate = new Date(cy, cm - 1 + offset, 1)
        const threshKey = threshDate.toISOString().slice(0, 7)

        // Count customers whose last activity is at or after threshold month
        const retained = members.filter((id) => {
          const last = lastActiveMonth.get(id)
          // If no event data, fall back to current status
          if (!last) {
            const c = customers.find((x) => x.id === id)
            return c?.status === 'active' || c?.status === 'trialing'
          }
          return last >= threshKey
        }).length

        return Math.round((retained / total) * 100)
      })

      return {
        month: new Date(`${cohortMonth}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        size: total,
        retention,
      }
    })

    const result = { months: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'], grid }
    kpiCache.set(cacheKey, result, 300 * 1000) // 5 min TTL
    return result
  },
}
