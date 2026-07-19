import Stripe from 'stripe'
import { config } from '../shared/lib/config'

// Single Stripe SDK instance + helpers, reused across billing routes/webhooks.
export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
})

export function verifyWebhookSignature(
  payload: Buffer | string,
  signature: string | undefined,
  webhookSecret: string
): Stripe.Event {
  if (!signature) {
    throw new Error('Missing stripe-signature header')
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

export function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}
