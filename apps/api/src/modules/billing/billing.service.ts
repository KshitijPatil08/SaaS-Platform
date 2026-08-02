import { prisma } from '../shared/lib/prisma'

export interface MrrPoint {
  date: Date
  mrr: number
  newMrr: number
  expansionMrr: number   // upgrade revenue from existing customers
  contractionMrr: number // downgrade revenue lost from existing customers
  churnedMrr: number
  customerCount: number  // included so the frontend can compute customer MoM change
}

export const billingService = {
  // MRR time series for charting (last 12 snapshots for the company)
  async getMrrSeries(companyId: string, take = 12): Promise<MrrPoint[]> {
    const snapshots = await prisma.mRRSnapshot.findMany({
      where: { company_id: companyId },
      orderBy: { date: 'asc' },
      take,
    })

    return snapshots.map((s) => ({
      date: s.date,
      mrr: s.mrr_cents,
      newMrr: s.new_mrr_cents,
      expansionMrr: s.expansion_mrr_cents,
      contractionMrr: s.contraction_mrr_cents,
      churnedMrr: s.churned_mrr_cents,
      customerCount: s.customer_count,
    }))
  },

  // Upsert a subscription from a Stripe webhook event
  async upsertSubscription(sub: {
    id: string
    customerId: string
    plan: string
    mrrCents: number
    status: string
    currentPeriodStart: number
    currentPeriodEnd: number
    canceledAt: number | null
  }) {
    // Look up the customer by external_id first (now compound unique, not globally unique)
    const customer = await prisma.customer.findFirst({
      where: { external_id: sub.customerId },
      select: { id: true },
    })

    if (!customer) {
      console.warn(`[billingService] Customer not found for external_id: ${sub.customerId}`)
      return null
    }

    return prisma.subscription.upsert({
      where: { stripe_subscription_id: sub.id },
      create: {
        stripe_subscription_id: sub.id,
        customer: { connect: { id: customer.id } },
        plan: sub.plan,
        mrr_cents: sub.mrrCents,
        status: sub.status,
        current_period_start: new Date(sub.currentPeriodStart * 1000),
        current_period_end: new Date(sub.currentPeriodEnd * 1000),
        canceled_at: sub.canceledAt ? new Date(sub.canceledAt * 1000) : null,
      },
      update: {
        plan: sub.plan,
        mrr_cents: sub.mrrCents,
        status: sub.status,
        current_period_start: new Date(sub.currentPeriodStart * 1000),
        current_period_end: new Date(sub.currentPeriodEnd * 1000),
        canceled_at: sub.canceledAt ? new Date(sub.canceledAt * 1000) : null,
      },
    })
  },

  async markSubscriptionCanceled(stripeSubscriptionId: string) {
    return prisma.subscription.updateMany({
      where: { stripe_subscription_id: stripeSubscriptionId },
      data: { status: 'canceled', canceled_at: new Date() },
    })
  },

  async activateCustomerOnInvoice(customerId: string) {
    return prisma.customer.updateMany({
      where: { external_id: customerId },
      data: { status: 'active' },
    })
  },

  // Safe daily MRRSnapshot recording with normalized UTC midnight date constraint matching
  async upsertSnapshot(
    companyId: string,
    snapshot: {
      date?: Date
      mrrCents: number
      newMrrCents?: number
      expansionMrrCents?: number
      contractionMrrCents?: number
      churnedMrrCents?: number
      customerCount?: number
    }
  ) {
    const date = snapshot.date ? new Date(snapshot.date) : new Date()
    date.setUTCHours(0, 0, 0, 0)

    return prisma.mRRSnapshot.upsert({
      where: {
        company_id_date: {
          company_id: companyId,
          date,
        },
      },
      update: {
        mrr_cents: snapshot.mrrCents,
        new_mrr_cents: snapshot.newMrrCents ?? 0,
        expansion_mrr_cents: snapshot.expansionMrrCents ?? 0,
        contraction_mrr_cents: snapshot.contractionMrrCents ?? 0,
        churned_mrr_cents: snapshot.churnedMrrCents ?? 0,
        customer_count: snapshot.customerCount ?? 0,
      },
      create: {
        company_id: companyId,
        date,
        mrr_cents: snapshot.mrrCents,
        new_mrr_cents: snapshot.newMrrCents ?? 0,
        expansion_mrr_cents: snapshot.expansionMrrCents ?? 0,
        contraction_mrr_cents: snapshot.contractionMrrCents ?? 0,
        churned_mrr_cents: snapshot.churnedMrrCents ?? 0,
        customer_count: snapshot.customerCount ?? 0,
      },
    })
  },

  // Aggregates total active MRR and customer count for company, then records snapshot
  async snapshotCurrentMrr(companyId: string) {
    const activeCustomers = await prisma.customer.findMany({
      where: {
        company_id: companyId,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      select: { mrr_cents: true },
    })

    const totalMrrCents = activeCustomers.reduce((acc, c) => acc + (c.mrr_cents || 0), 0)
    const customerCount = activeCustomers.length

    return this.upsertSnapshot(companyId, {
      date: new Date(),
      mrrCents: totalMrrCents,
      customerCount,
    })
  },
}
