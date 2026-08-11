import { prisma } from '../shared/lib/prisma'

export interface HealthSignals {
  payment_status: string
  days_inactive: number
  mrr_cents: number
  trial_days_left?: number
  account_age_days: number
}

export interface HealthScoreWeights {
  paymentWeightPct: number
  eventActivityWeightPct: number
  accountAgeWeightPct: number
  mrrTrendWeightPct: number
}

const DEFAULT_WEIGHTS: HealthScoreWeights = {
  paymentWeightPct: 40,
  eventActivityWeightPct: 20,
  accountAgeWeightPct: 20,
  mrrTrendWeightPct: 20,
}

/**
 * Load this company's custom health score weights from DB.
 * Falls back to DEFAULT_WEIGHTS if not configured or on parse error.
 *
 * Loaded once per recomputeAll batch — not per-customer — for efficiency.
 */
async function loadCompanyWeights(companyId: string): Promise<HealthScoreWeights> {
  try {
    const company = await (prisma.company as any).findUnique({
      where: { id: companyId },
      select: { health_score_config: true },
    })
    if (!company?.health_score_config || company.health_score_config === '{}') {
      return DEFAULT_WEIGHTS
    }
    const parsed = JSON.parse(company.health_score_config)
    // Merge with defaults so partial configs still work
    return { ...DEFAULT_WEIGHTS, ...parsed }
  } catch {
    return DEFAULT_WEIGHTS
  }
}

export const healthScoreService = {
  /**
   * Computes a 0-100 health score based on customer activity, payment status, and trial lifecycle.
   * Respects the company's custom signal weights if configured.
   *
   * @param customerId  Customer to score
   * @param companyId   Tenant scope
   * @param weights     Pre-loaded weights (pass from recomputeAll to avoid N DB round-trips)
   */
  async computeScoreForCustomer(
    customerId: string,
    companyId: string,
    weights: HealthScoreWeights = DEFAULT_WEIGHTS
  ) {
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

    const now = new Date()
    // Normalize weights to fractions (sum should be 100, convert to 0-1)
    const wPayment = (weights.paymentWeightPct / 100)
    const wActivity = (weights.eventActivityWeightPct / 100)
    const wAge = (weights.accountAgeWeightPct / 100)
    // mrrTrend weight not yet a separate score signal, contributes to baseline

    // ── Signal 1: Payment / Subscription Status (weighted) ─────────────────
    let paymentScore = 75 // baseline
    if (customer.status === 'past_due') {
      paymentScore = 15
    } else if (customer.status === 'canceled') {
      paymentScore = 0
    } else if (customer.status === 'active') {
      paymentScore = 90
    } else if (customer.status === 'trialing') {
      if (customer.trial_ends_at) {
        const daysLeft = Math.ceil(
          (customer.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        paymentScore = daysLeft <= 3 ? 50 : daysLeft <= 7 ? 65 : 75
      } else {
        paymentScore = 70
      }
    }

    // ── Signal 2: Activity / Inactivity (weighted) ──────────────────────────
    const lastEvent = customer.events[0]
    const lastActiveDate = lastEvent ? new Date(lastEvent.occurred_at) : new Date(customer.created_at)
    const daysInactive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))

    let activityScore = 100
    if (daysInactive > 30) activityScore = 10
    else if (daysInactive > 14) activityScore = 40
    else if (daysInactive > 7) activityScore = 65
    else if (daysInactive <= 3) activityScore = 100

    // ── Signal 3: Account Age (weighted) ────────────────────────────────────
    const accountAgeDays = Math.floor(
      (now.getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    let ageScore = 80
    if (accountAgeDays > 365) ageScore = 95
    else if (accountAgeDays > 90) ageScore = 85
    else if (accountAgeDays < 14) ageScore = 55 // new accounts have higher churn risk

    // ── Weighted composite score ─────────────────────────────────────────────
    // Remaining weight after payment + activity + age goes to the mrrTrend baseline
    const remainingWeight = 1 - wPayment - wActivity - wAge
    const rawScore =
      paymentScore * wPayment +
      activityScore * wActivity +
      ageScore * wAge +
      75 * Math.max(0, remainingWeight) // mrrTrend signal treated as neutral (75) for now

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)))

    const signals: HealthSignals = {
      payment_status: customer.status,
      days_inactive: daysInactive,
      mrr_cents: customer.mrr_cents,
      account_age_days: accountAgeDays,
      ...(customer.trial_ends_at
        ? {
            trial_days_left: Math.ceil(
              (customer.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          }
        : {}),
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
   * Loads company weights ONCE per call, then fans out in batches of 50.
   * Previous: O(N) DB queries for weights (one per customer). Now: O(1) weight load.
   *
   * Time complexity: O(N) customer reads + O(N/50) batch writes
   * Space complexity: O(batch_size) = O(50) — constant memory per batch
   */
  async recomputeAll(companyId: string) {
    const BATCH_SIZE = 50

    // Load weights once — reused for all customers in this company
    const weights = await loadCompanyWeights(companyId)

    const customers = await prisma.customer.findMany({
      where: { company_id: companyId },
      select: { id: true },
    })

    let computed = 0

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map((c) => this.computeScoreForCustomer(c.id, companyId, weights))
      )

      computed += batchResults.filter(Boolean).length
    }

    return { total: customers.length, computed }
  },

  /**
   * Loads and returns a company's configured health score weights.
   * Exported so predictive-churn.service can reuse the same weights.
   */
  loadCompanyWeights,
}
