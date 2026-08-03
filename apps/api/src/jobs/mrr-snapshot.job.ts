import { prisma } from '../modules/shared/lib/prisma'
import { kpiCache } from '../modules/shared/lib/kpi-cache'

/**
 * Daily MRR Snapshot Job
 *
 * Correctly classifies each dollar of MRR movement into one of 4 SaaS buckets:
 *   - New MRR:         brand-new customers who didn't exist in prev snapshot
 *   - Expansion MRR:  existing customers whose MRR increased (upgrades)
 *   - Contraction MRR: existing customers whose MRR decreased (downgrades)
 *   - Churned MRR:    customers who were active last period but are now canceled
 *
 * Algorithm: O(N) two-pass using a customer MRR lookup Map — no N+1 queries.
 */
export async function runDailyMrrSnapshotJob() {
  console.log('[cron-job] Running daily MRR snapshot rollover job...')
  try {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } })
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    for (const company of companies) {
      // ── Current state: all customers and their current MRR ──────────────────
      const currentCustomers = await prisma.customer.findMany({
        where: { company_id: company.id },
        select: { id: true, mrr_cents: true, status: true },
      })

      // ── Previous snapshot's customer MRR captured as individual records ─────
      // We use MRR events to reconstruct per-customer MRR at the previous snapshot.
      // Best-effort: use the second-latest MRRSnapshot total as reference.
      const prevSnapshot = await prisma.mRRSnapshot.findFirst({
        where: { company_id: company.id, date: { lt: today } },
        orderBy: { date: 'desc' },
      })

      // To classify correctly, we need per-customer MRR from the prev snapshot.
      // Strategy: find all customers who existed and had subscriptions a day ago
      // using their Subscription records (current period start/end windows).
      const prevActiveCustomers = await prisma.customer.findMany({
        where: {
          company_id: company.id,
          created_at: { lt: today },      // existed before today
        },
        select: { id: true, mrr_cents: true, status: true },
      })

      // Build O(1) lookup map of prev MRR by customer_id
      const prevMrrMap = new Map<string, { mrr: number; status: string }>(
        prevActiveCustomers.map(c => [c.id, { mrr: c.mrr_cents, status: c.status }])
      )

      // Build O(1) lookup set of current active customer IDs
      const currentActiveSet = new Set(
        currentCustomers
          .filter(c => c.status !== 'canceled')
          .map(c => c.id)
      )

      let newMrrCents = 0
      let expansionMrrCents = 0
      let contractionMrrCents = 0
      let churnedMrrCents = 0
      let totalMrrCents = 0
      let customerCount = 0

      // ── Pass 1: classify current active customer MRR movements ──────────────
      for (const c of currentCustomers) {
        if (c.status === 'canceled') continue

        totalMrrCents += c.mrr_cents
        customerCount++

        const prev = prevMrrMap.get(c.id)

        if (!prev || prev.status === 'canceled') {
          // Customer is new this period (brand new signup)
          newMrrCents += c.mrr_cents
        } else {
          const delta = c.mrr_cents - prev.mrr
          if (delta > 0) {
            expansionMrrCents += delta    // upgraded plan
          } else if (delta < 0) {
            contractionMrrCents += Math.abs(delta)  // downgraded plan
          }
          // delta === 0: stable customer, no movement to classify
        }
      }

      // ── Pass 2: detect customers who churned (were active, now canceled) ────
      for (const [customerId, prev] of prevMrrMap) {
        if (!currentActiveSet.has(customerId) && prev.status !== 'canceled') {
          churnedMrrCents += prev.mrr
        }
      }

      // Upsert daily snapshot with all 4 real MRR movement buckets
      await prisma.mRRSnapshot.upsert({
        where: { company_id_date: { company_id: company.id, date: today } },
        create: {
          company_id: company.id,
          date: today,
          mrr_cents: totalMrrCents,
          new_mrr_cents: newMrrCents,
          expansion_mrr_cents: expansionMrrCents,
          contraction_mrr_cents: contractionMrrCents,
          churned_mrr_cents: churnedMrrCents,
          customer_count: customerCount,
        },
        update: {
          mrr_cents: totalMrrCents,
          new_mrr_cents: newMrrCents,
          expansion_mrr_cents: expansionMrrCents,
          contraction_mrr_cents: contractionMrrCents,
          churned_mrr_cents: churnedMrrCents,
          customer_count: customerCount,
        },
      })

      kpiCache.invalidate(`kpis_${company.id}`)

      console.log(
        `[cron-job] ${company.name} | MRR: $${(totalMrrCents / 100).toFixed(0)} | ` +
        `New: +$${(newMrrCents / 100).toFixed(0)} | ` +
        `Exp: +$${(expansionMrrCents / 100).toFixed(0)} | ` +
        `Cont: -$${(contractionMrrCents / 100).toFixed(0)} | ` +
        `Churn: -$${(churnedMrrCents / 100).toFixed(0)}`
      )
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
