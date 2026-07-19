import express from 'express'
import type Stripe from 'stripe'
import { prisma } from '../shared/lib/prisma'
import { stripe, verifyWebhookSignature, extractCustomerId } from './stripe.client'
import { billingService } from './billing.service'

const router = express.Router()

// app.ts mounts this router at /webhooks/stripe and applies express.raw() for
// that path, so req.body is a Buffer available for signature verification.
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
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await billingService.markSubscriptionCanceled(sub.id)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        if (!customerId) break
        await billingService.activateCustomerOnInvoice(customerId)
        break
      }
      default:
        // Unhandled event type
        break
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
})

// Re-export for backwards-compat if anything referenced the raw client
export { stripe }

export default router
