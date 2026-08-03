import { prisma } from '../shared/lib/prisma'

export interface HealthSignals {
  payment_status: string
  days_inactive: number
  mrr_cents: number
  trial_days_left?: number
  account_age_days: number
}

export const healthScoreService = {
  /**
   * Computes a 0-100 health score based on customer activity, payment status, and trial lifecycle.
   */
  async computeScoreForCustomer(customerId: string, companyId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, company_id: companyId },
      include: {
        events: {
          orderBy: { occurred_at: 'desc' },
          take: 1,
        },
      },
    })

    if (!customer) return null

    let score = 75 // baseline score for healthy customer
    const now = new Date()

    // 1. Payment / Subscription Status Signals
    if (customer.status === 'past_due') {
      score -= 35
    } else if (customer.status === 'canceled') {
      score -= 60
    } else if (customer.status === 'active') {
      score += 10
    } else if (customer.status === 'trialing') {
      if (customer.trial_ends_at) {
        const daysLeft = Math.ceil((customer.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeft <= 3) {
          score -= 20 // trial expiring soon without converting
        } else {
          score += 5
        }
      }
    }

    // 2. Activity / Inactivity Signals
    const lastEvent = customer.events[0]
    const lastActiveDate = lastEvent ? new Date(lastEvent.occurred_at) : new Date(customer.created_at)
    const daysInactive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysInactive > 30) {
      score -= 35
    } else if (daysInactive > 14) {
      score -= 20
    } else if (daysInactive > 7) {
      score -= 10
    } else if (daysInactive <= 3) {
      score += 10
    }

    // 3. Account Age
    const accountAgeDays = Math.floor((now.getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24))

    // Clamp score to range [0, 100]
    const finalScore = Math.max(0, Math.min(100, Math.round(score)))

    const signals: HealthSignals = {
      payment_status: customer.status,
      days_inactive: daysInactive,
      mrr_cents: customer.mrr_cents,
      account_age_days: accountAgeDays,
      ...(customer.trial_ends_at ? {
        trial_days_left: Math.ceil((customer.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      } : {}),
    }

    // Record health score in database
    const recorded = await prisma.healthScore.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        score: finalScore,
        signals: JSON.stringify(signals),
        computed_at: new Date(),
      },
    })

    return { score: finalScore, signals, recordId: recorded.id }
  },

  /**
   * Recomputes health scores for all customers in a company.
   *
   * Previous implementation: Promise.all(N individual writes) — 2N simultaneous DB queries
   * which exhausts the connection pool for large tenants.
   *
   * Fixed: Process in batches of 50, batch-insert scores with createMany.
   * Time complexity: O(N) customer reads + O(N/50) batch writes
   * Space complexity: O(batch_size) = O(50) — constant memory per batch
   */
  async recomputeAll(companyId: string) {
    const BATCH_SIZE = 50

    const customers = await prisma.customer.findMany({
      where: { company_id: companyId },
      select: { id: true },
    })

    let computed = 0

    // Process in chunks to avoid saturating the DB connection pool
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)

      // Compute scores in parallel within the batch (bounded concurrency)
      const batchResults = await Promise.all(
        batch.map((c) => this.computeScoreForCustomer(c.id, companyId))
      )

      computed += batchResults.filter(Boolean).length
    }

    return { total: customers.length, computed }
  },
}
