/**
 * vendor-billing.webhook.ts
 *
 * Handles Stripe webhook events for PULSE'S OWN subscription lifecycle.
 * Mounted at /webhooks/stripe-vendor (separate from /webhooks/stripe which
 * handles your CUSTOMERS' Stripe events).
 *
 * Events handled:
 *   checkout.session.completed         → activate plan after first payment
 *   customer.subscription.updated      → sync plan tier changes / renewals
 *   customer.subscription.deleted      → downgrade to free on cancellation
 */

import express, { type Request, type Response } from 'express'
import type Stripe from 'stripe'
import { stripe } from '../billing/stripe.client'
import { prisma } from '../shared/lib/prisma'
import { config } from '../shared/lib/config'
import { priceIdToTier } from './plan-limits'

const router = express.Router()

function extractCompanyId(metadata: Stripe.Metadata | null): string | null {
  return metadata?.pulse_company_id ?? null
}

function resolveCompanyIdFromCustomer(customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  if (!customerId) return Promise.resolve(null)
  const id = typeof customerId === 'string' ? customerId : customerId.id
  return prisma.company
    .findFirst({ where: { vendor_stripe_customer_id: id }, select: { id: true } })
    .then(c => c?.id ?? null)
}

router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string

  if (!config.stripeVendorWebhookSecret) {
    console.warn('[vendor-webhook] STRIPE_VENDOR_WEBHOOK_SECRET not set — skipping signature check in dev')
    return res.json({ received: true })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeVendorWebhookSecret)
  } catch (err) {
    console.error('[vendor-webhook] Signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  try {
    // ── Idempotency guard ────────────────────────────────────────────────────
    // Stripe guarantees at-least-once delivery. If the same event fires twice,
    // we must not process it again (e.g., subscription.deleted should not
    // double-downgrade a company that already re-subscribed).
    const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
      where: { event_id: event.id },
    })
    if (alreadyProcessed) {
      console.log(`[vendor-webhook] Duplicate event ${event.id} — already processed, skipping`)
      return res.json({ received: true })
    }

    switch (event.type) {
      // ── First successful payment after Checkout ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const companyId = extractCompanyId(session.metadata)
        if (!companyId) break

        const plan = session.metadata?.plan ?? 'starter'
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        await prisma.company.update({
          where: { id: companyId },
          data: {
            plan_tier: plan,
            vendor_subscription_id: subscriptionId ?? null,
            plan_expires_at: null,  // active subscription — no hard expiry
          },
        })

        console.log(`[vendor-webhook] Plan activated: company=${companyId} plan=${plan}`)
        break
      }

      // ── Subscription updated (upgrade / downgrade / renewal) ─────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const companyId =
          extractCompanyId(sub.metadata) ??
          await resolveCompanyIdFromCustomer(sub.customer)

        if (!companyId) break

        const priceId = sub.items.data[0]?.price.id
        const tier = priceId
          ? priceIdToTier(priceId, config)
          : null

        if (!tier) {
          console.warn(`[vendor-webhook] Unknown price ID ${priceId} — skipping tier update`)
          break
        }

        const expiresAt = sub.cancel_at
          ? new Date(sub.cancel_at * 1000)
          : null

        await prisma.company.update({
          where: { id: companyId },
          data: {
            plan_tier: tier,
            vendor_subscription_id: sub.id,
            plan_expires_at: expiresAt,
          },
        })

        console.log(`[vendor-webhook] Plan updated: company=${companyId} tier=${tier}`)
        break
      }

      // ── Subscription cancelled / expired ─────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const companyId =
          extractCompanyId(sub.metadata) ??
          await resolveCompanyIdFromCustomer(sub.customer)

        if (!companyId) break

        await prisma.company.update({
          where: { id: companyId },
          data: {
            plan_tier: 'free',
            vendor_subscription_id: null,
            plan_expires_at: null,
          },
        })

        console.log(`[vendor-webhook] Plan cancelled → free: company=${companyId}`)
        break
      }

      default:
        // Unhandled vendor event — not an error
        break
    }

    // Mark this event as processed so retries are no-ops
    await (prisma as any).processedWebhookEvent.create({
      data: { event_id: event.id, event_type: event.type },
    })

    return res.json({ received: true })
  } catch (err) {
    console.error('[vendor-webhook] Handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
})

export default router
