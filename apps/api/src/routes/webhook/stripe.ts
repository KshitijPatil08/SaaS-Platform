import express from 'express'
import Stripe from 'stripe'
import { prisma } from '../../lib/prisma'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// IMPORTANT: this route must use express.raw() in app.ts so req.body is a Buffer
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const amount = (sub.items.data[0]?.price.unit_amount ?? 0)
        await prisma.subscription.upsert({
          where: { stripe_subscription_id: sub.id },
          create: {
            stripe_subscription_id: sub.id,
            customer: { connect: { external_id: customerId } },
            plan: sub.items.data[0]?.price.id ?? 'unknown',
            mrr_cents: amount,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000),
            current_period_end: new Date(sub.current_period_end * 1000),
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          },
          update: {
            plan: sub.items.data[0]?.price.id ?? 'unknown',
            mrr_cents: amount,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000),
            current_period_end: new Date(sub.current_period_end * 1000),
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          },
        })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.subscription.updateMany({
          where: { stripe_subscription_id: sub.id },
          data: { status: 'canceled', canceled_at: new Date() },
        })
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.customer) break
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
        await prisma.customer.updateMany({
          where: { external_id: customerId },
          data: { status: 'active' },
        })
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

export default router
