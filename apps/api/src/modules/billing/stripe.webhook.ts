import express from 'express'
import type Stripe from 'stripe'
import { prisma } from '../shared/lib/prisma'
import { stripe, verifyWebhookSignature, extractCustomerId } from './stripe.client'
import { billingService } from './billing.service'
import { healthScoreService } from '../analytics/health-score.service'
import { kpiCache } from '../shared/lib/kpi-cache'

const router = express.Router()

// Helper: trigger post-webhook background updates (MRR snapshot, health score, cache invalidation)
async function triggerPostWebhookUpdates(customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { external_id: customerId },
    select: { id: true, company_id: true, name: true, mrr_cents: true },
  })

  if (!customer) return null

  // 1. Recompute current MRR snapshot
  await billingService.snapshotCurrentMrr(customer.company_id)

  // 2. Recompute health score for this customer
  await healthScoreService.computeScoreForCustomer(customer.id, customer.company_id)

  // 3. Invalidate KPI cache
  kpiCache.invalidate(`kpis_${customer.company_id}`)

  return customer
}

// app.ts mounts this router at /webhooks/stripe and applies express.raw()
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = extractCustomerId(sub.customer)
        if (!customerId) break

        await billingService.upsertSubscription({
          id: sub.id,
          customerId,
          plan: sub.items.data[0]?.price.id ?? 'unknown',
          mrrCents: sub.items.data[0]?.price.unit_amount ?? 0,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          canceledAt: sub.canceled_at,
        })

        await triggerPostWebhookUpdates(customerId)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = extractCustomerId(sub.customer)
        
        await billingService.markSubscriptionCanceled(sub.id)

        if (customerId) {
          const customer = await triggerPostWebhookUpdates(customerId)
          if (customer) {
            // Record ChurnEvent for analytics
            await prisma.churnEvent.create({
              data: {
                company_id: customer.company_id,
                customer_id: customer.id,
                mrr_lost_cents: sub.items.data[0]?.price.unit_amount ?? customer.mrr_cents ?? 0,
                reason: 'subscription_canceled',
                churned_at: new Date(),
              },
            })

            console.warn(
              `[ALERT] Churn Event Recorded: Customer "${customer.name}" (${customer.id}) canceled. Lost MRR: $${(
                (customer.mrr_cents || 0) / 100
              ).toFixed(2)}`
            )
          }
        }
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        if (!customerId) break
        
        await billingService.activateCustomerOnInvoice(customerId)
        await triggerPostWebhookUpdates(customerId)
        break
      }
      default:
        break
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
})

export { stripe }
export default router
