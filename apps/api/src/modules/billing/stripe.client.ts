import Stripe from 'stripe'

// Single Stripe SDK instance + helpers, reused across billing routes/webhooks.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
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
