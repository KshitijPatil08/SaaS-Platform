import express from 'express'
import type Stripe from 'stripe'
import { prisma } from '../shared/lib/prisma'
import { stripe, verifyWebhookSignature, extractCustomerId } from './stripe.client'
import { billingService } from './billing.service'
import { healthScoreService } from '../analytics/health-score.service'
import { kpiCache } from '../shared/lib/kpi-cache'

const router = express.Router()

/**
 * Resolves customer record from external Stripe customer ID.
 * Returns null if customer not found — caller must guard.
 */
async function resolveCustomer(customerId: string) {
  return prisma.customer.findFirst({
    where: { external_id: customerId },
    select: { id: true, company_id: true, name: true, mrr_cents: true },
  })
}

/**
 * Schedules post-webhook side-effects as a fire-and-forget background task.
 *
 * Stripe requires HTTP 200 within 30s or it retries. Heavy DB writes
 * (MRR snapshot, health score) must NOT block the webhook response.
 * setImmediate() yields the event loop so Express can flush the response first.
 */
function schedulePostWebhookUpdates(customerId: string): void {
  setImmediate(async () => {
    try {
      const customer = await resolveCustomer(customerId)
      if (!customer) return

      await billingService.snapshotCurrentMrr(customer.company_id)
      await healthScoreService.computeScoreForCustomer(customer.id, customer.company_id)
      kpiCache.invalidate(`kpis_${customer.company_id}`)
    } catch (err) {
      console.error('[webhook] Background post-webhook update failed:', err)
    }
  })
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

        // Non-blocking: MRR snapshot + health score update run after response
        schedulePostWebhookUpdates(customerId)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = extractCustomerId(sub.customer)

        await billingService.markSubscriptionCanceled(sub.id)

        if (customerId) {
          // Resolve customer synchronously — needed to log the ChurnEvent
          const customer = await resolveCustomer(customerId)
          if (customer) {
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
              `[ALERT] Churn: "${customer.name}" canceled. Lost MRR: $${((customer.mrr_cents || 0) / 100).toFixed(2)}`
            )
          }
          // Side-effects fire after response
          schedulePostWebhookUpdates(customerId)
        }
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        if (!customerId) break

        await billingService.activateCustomerOnInvoice(customerId)
        schedulePostWebhookUpdates(customerId)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        if (!customerId) break

        // Mark past_due synchronously — this is the critical state change
        await prisma.customer.updateMany({
          where: { external_id: customerId },
          data: { status: 'past_due' },
        })

        // Emit dunning event synchronously so the record exists immediately
        const customer = await resolveCustomer(customerId)
        if (customer) {
          await prisma.event.create({
            data: {
              company_id: customer.company_id,
              customer_id: customer.id,
              name: 'payment_failed',
              occurred_at: new Date(),
              properties: JSON.stringify({
                invoice_id: (invoice as any).id,
                amount_due: (invoice as any).amount_due,
                attempt_count: (invoice as any).attempt_count ?? 1,
              }),
            },
          })
          console.warn(
            `[ALERT] Payment Failed: "${customer.name}" <${(customer as any).email}> MRR at risk: $${((customer.mrr_cents || 0) / 100).toFixed(2)}`
          )
          // Heavy side-effects fire after response returns
          schedulePostWebhookUpdates(customerId)
        }
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
