import { prisma } from '../shared/lib/prisma'

export interface MrrPoint {
  date: Date
  mrr: number
  newMrr: number
  churnedMrr: number
  customerCount: number    // included so the frontend can compute customer MoM change
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
    return prisma.subscription.upsert({
      where: { stripe_subscription_id: sub.id },
      create: {
        stripe_subscription_id: sub.id,
        customer: { connect: { external_id: sub.customerId } },
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
}
