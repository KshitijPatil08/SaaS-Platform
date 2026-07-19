import { prisma } from '../shared/lib/prisma'

// Shared aggregation helpers for the KPIs, funnel, and health endpoints.
export const analyticsService = {
  // Top-level KPI snapshot: MRR, customer count, churn rate
  async getKpis(companyId: string) {
    const [customerCount, mrrSnapshot, churnCount] = await Promise.all([
      prisma.customer.count({ where: { company_id: companyId } }),
      prisma.mRRSnapshot.findFirst({
        where: { company_id: companyId },
        orderBy: { date: 'desc' },
      }),
      prisma.churnEvent.count({ where: { company_id: companyId } }),
    ])

    const churnRate = customerCount > 0 ? (churnCount / customerCount) * 100 : 0

    return {
      mrr_cents: mrrSnapshot?.mrr_cents ?? 0,
      customer_count: customerCount,
      churn_rate: churnRate,
    }
  },

  // Conversion funnel counts grouped by event name
  async getFunnel(companyId: string) {
    const events = await prisma.event.groupBy({
      by: ['name'],
      where: { company_id: companyId },
      _count: { _all: true },
    })

    const countByName = new Map(events.map((e) => [e.name, e._count._all]))

    const visitors = countByName.get('visitor') ?? 0
    const signups = countByName.get('signup') ?? 0
    const activations = countByName.get('activation') ?? 0
    const trials = countByName.get('trial_started') ?? 0
    const paid = countByName.get('subscription_created') ?? 0

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
}
