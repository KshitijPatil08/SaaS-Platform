import { prisma } from '../modules/shared/lib/prisma'
import { kpiCache } from '../modules/shared/lib/kpi-cache'

export async function runDailyMrrSnapshotJob() {
  console.log('[cron-job] Running daily MRR snapshot rollover job...')
  try {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } })
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const company of companies) {
      // Calculate current active MRR and customer count
      const activeCustomers = await prisma.customer.findMany({
        where: {
          company_id: company.id,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
        select: { mrr_cents: true },
      })

      const totalMrrCents = activeCustomers.reduce((acc, c) => acc + (c.mrr_cents || 0), 0)
      const customerCount = activeCustomers.length

      // Get previous snapshot to compute delta movement
      const prevSnapshot = await prisma.mRRSnapshot.findFirst({
        where: { company_id: company.id, date: { lt: today } },
        orderBy: { date: 'desc' },
      })

      const prevMrr = prevSnapshot?.mrr_cents ?? 0
      const deltaMrr = totalMrrCents - prevMrr

      const newMrrCents = deltaMrr > 0 ? deltaMrr : 0
      const churnedMrrCents = deltaMrr < 0 ? Math.abs(deltaMrr) : 0

      // Upsert daily snapshot record
      await prisma.mRRSnapshot.upsert({
        where: {
          company_id_date: {
            company_id: company.id,
            date: today,
          },
        },
        create: {
          company_id: company.id,
          date: today,
          mrr_cents: totalMrrCents,
          new_mrr_cents: newMrrCents,
          expansion_mrr_cents: 0,
          contraction_mrr_cents: 0,
          churned_mrr_cents: churnedMrrCents,
          customer_count: customerCount,
        },
        update: {
          mrr_cents: totalMrrCents,
          new_mrr_cents: newMrrCents,
          churned_mrr_cents: churnedMrrCents,
          customer_count: customerCount,
        },
      })

      // Invalidate company KPI cache
      kpiCache.set(`kpis_${company.id}`, null, 0)
    }

    console.log(`[cron-job] Completed snapshot job for ${companies.length} companies.`)
  } catch (err) {
    console.error('[cron-job] Error running daily snapshot job:', err)
  }
}

// Auto-run worker interval on API boot (every 12 hours)
export function startSnapshotWorker() {
  // Run initial job 5 seconds after boot
  setTimeout(() => {
    runDailyMrrSnapshotJob().catch(console.error)
  }, 5000)

  // Interval: 12 hours
  setInterval(() => {
    runDailyMrrSnapshotJob().catch(console.error)
  }, 12 * 60 * 60 * 1000)
}
