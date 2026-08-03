import { prisma } from '../modules/shared/lib/prisma'
import { kpiCache } from '../modules/shared/lib/kpi-cache'
import { healthScoreService } from '../modules/analytics/health-score.service'
import { withJobLock } from '../modules/shared/lib/job-lock'

/**
 * Nightly Health Score Recomputation Job
 *
 * Iterates all active companies and recomputes health scores for every
 * customer within each company using the healthScoreService.
 *
 * Companies are processed sequentially (not in parallel) to avoid
 * overwhelming the database with burst writes across all tenants simultaneously.
 *
 * Within each company, customers are batched in groups of 50
 * (handled inside healthScoreService.recomputeAll) to bound concurrency.
 *
 * Algorithm:
 *   - Time complexity:  O(N) per company — 1 read + 1 score insert per customer
 *   - Space complexity: O(batch_size) = O(50) — constant memory
 *
 * Runs every 24 hours at 2:00 AM UTC (offset 5s after boot for initial warm-up).
 */
export async function runNightlyHealthScoreJob() {
  console.log('[health-score-job] Starting nightly health score recomputation...')
  const start = Date.now()

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    })

    let totalCustomers = 0
    let totalComputed = 0

    for (const company of companies) {
      try {
        const result = await healthScoreService.recomputeAll(company.id)
        totalCustomers += result.total
        totalComputed += result.computed

        // Invalidate KPI cache so next dashboard load shows fresh health data
        kpiCache.invalidate(`kpis_${company.id}`)
        kpiCache.invalidate(`cohorts_${company.id}`)

        console.log(
          `[health-score-job] ${company.name}: ${result.computed}/${result.total} scores recomputed`
        )
      } catch (companyErr) {
        // Isolate per-company failures — don't abort the whole run
        console.error(
          `[health-score-job] Error processing company ${company.id} (${company.name}):`,
          companyErr
        )
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(
      `[health-score-job] Done. ${totalComputed}/${totalCustomers} scores recomputed ` +
      `across ${companies.length} companies in ${elapsed}s.`
    )
  } catch (err) {
    console.error('[health-score-job] Fatal error during health score job:', err)
  }
}

/**
 * Starts the nightly health score worker.
 * Schedules a warm-up run 10 seconds after API boot, then every 24 hours.
 */
export function startHealthScoreWorker() {
  // Initial run: 10s after boot (stagger from snapshot job's 5s boot)
  setTimeout(() => {
    withJobLock('nightly-health-score', 3 * 60 * 60 * 1000, () => runNightlyHealthScoreJob())
      .catch(console.error)
  }, 10_000)

  // Recurring run: every 24 hours
  setInterval(() => {
    withJobLock('nightly-health-score', 3 * 60 * 60 * 1000, () => runNightlyHealthScoreJob())
      .catch(console.error)
  }, 24 * 60 * 60 * 1000)
}
