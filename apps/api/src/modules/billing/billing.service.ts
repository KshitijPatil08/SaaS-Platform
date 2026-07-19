import { prisma } from '../shared/lib/prisma'

export interface MrrPoint {
  date: Date
  mrr: number
  newMrr: number
  churnedMrr: number
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
}
