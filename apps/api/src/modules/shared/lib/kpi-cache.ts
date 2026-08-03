/**
 * KPI In-Process Cache
 *
 * Simple TTL Map cache for expensive aggregation queries.
 * Keyed by: `kpis_<companyId>`, `cohorts_<companyId>`, `predictive_churn_<companyId>`, etc.
 *
 * Warm-up: On server boot, `warmUpCache()` pre-populates keys from the last
 * recorded MRRSnapshot so there is zero cold-start penalty for the first request
 * after a deploy or restart.
 */

import { PrismaClient } from '@prisma/client'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()
const DEFAULT_TTL_MS = 60 * 1000 // 60 seconds TTL

export const kpiCache = {
  get<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }
    return entry.data as T
  },

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  },

  invalidate(keyPrefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key)
      }
    }
  },

  clear(): void {
    cache.clear()
  },

  size(): number {
    return cache.size
  },
}

/**
 * Warm up the KPI cache from the latest MRRSnapshot records for all companies.
 * Called once on server boot so the first HTTP request after a restart doesn't
 * trigger a cold-start N-query thundering herd on the database.
 *
 * Time Complexity: O(C) where C = number of companies
 * Space Complexity: O(C) cache entries added
 */
export async function warmUpCache(prisma: PrismaClient): Promise<void> {
  try {
    console.log('[cache] Warming up KPI cache from latest MRR snapshots...')

    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    })

    let warmedCount = 0

    await Promise.all(
      companies.map(async (company) => {
        const [latestSnapshot, activeCustomerCount, recentChurnCount] = await Promise.all([
          prisma.mRRSnapshot.findFirst({
            where: { company_id: company.id },
            orderBy: { date: 'desc' },
          }),
          prisma.customer.count({
            where: {
              company_id: company.id,
              status: { in: ['active', 'trialing', 'past_due'] },
            },
          }),
          prisma.churnEvent.count({
            where: {
              company_id: company.id,
              churned_at: { gte: new Date(Date.now() - 30 * 86_400_000) },
            },
          }),
        ])

        if (!latestSnapshot) return // No data yet for this company

        const mrrCents = latestSnapshot.mrr_cents
        const arpuCents = activeCustomerCount > 0
          ? Math.round(mrrCents / activeCustomerCount)
          : 0
        const startingBase = activeCustomerCount + recentChurnCount
        const churnRate = startingBase > 0
          ? Math.round((recentChurnCount / startingBase) * 1000) / 10
          : 0
        const monthlyChurnDecimal = Math.max(0.01, churnRate / 100)
        const ltvCents = Math.round(arpuCents / monthlyChurnDecimal)
        const quickRatio = latestSnapshot.churned_mrr_cents > 0
          ? Math.round((latestSnapshot.new_mrr_cents / latestSnapshot.churned_mrr_cents) * 10) / 10
          : latestSnapshot.new_mrr_cents > 0 ? 4.0 : 1.0

        // Pre-populate with a 90-second TTL so it survives until the first real request
        kpiCache.set(`kpis_${company.id}`, {
          mrr_cents: mrrCents,
          customer_count: activeCustomerCount,
          churn_rate: churnRate,
          arpu_cents: arpuCents,
          ltv_cents: ltvCents,
          quick_ratio: quickRatio,
        }, 90 * 1000)

        warmedCount++
      })
    )

    console.log(`[cache] Warm-up complete: ${warmedCount}/${companies.length} companies pre-loaded.`)
  } catch (err) {
    // Warm-up failure is non-fatal — first requests will compute from DB normally
    console.warn('[cache] Warm-up failed (non-fatal):', (err as Error).message)
  }
}
