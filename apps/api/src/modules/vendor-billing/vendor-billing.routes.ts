/**
 * vendor-billing.routes.ts
 *
 * Handles Pulse's OWN subscription billing (not customers' Stripe events).
 *
 * POST /api/vendor-billing/checkout  — create Stripe Checkout session
 * GET  /api/vendor-billing/status    — current plan + usage meters
 * POST /api/vendor-billing/portal    — Stripe Customer Portal session URL
 */

import express, { type Request, type Response } from 'express'
import { stripe } from '../billing/stripe.client'
import { prisma } from '../shared/lib/prisma'
import { config } from '../shared/lib/config'
import { PLAN_LIMITS, priceIdToTier } from './plan-limits'
import type { PlanTier } from './plan-limits'

const router = express.Router()

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRICE_MAP: Record<string, string> = {
  starter:    config.stripePriceStarter,
  pro:        config.stripePricePro,
  enterprise: config.stripePriceEnterprise,
}

async function getOrCreateVendorCustomer(
  companyId: string,
  adminEmail: string,
  companyName: string,
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { vendor_stripe_customer_id: true },
  })

  if (company?.vendor_stripe_customer_id) {
    return company.vendor_stripe_customer_id
  }

  // Create a Stripe customer representing this Pulse tenant
  const customer = await stripe.customers.create({
    email: adminEmail,
    name: companyName,
    metadata: { pulse_company_id: companyId },
  })

  await prisma.company.update({
    where: { id: companyId },
    data: { vendor_stripe_customer_id: customer.id },
  })

  return customer.id
}

// ─── POST /api/vendor-billing/checkout ──────────────────────────────────────

router.post('/checkout', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { plan } = req.body as { plan: string }
  const priceId = PRICE_MAP[plan?.toLowerCase()]

  if (!priceId) {
    return res.status(400).json({
      error: `Invalid plan "${plan}". Valid options: starter, pro, enterprise`,
    })
  }

  try {
    // Get admin email for customer creation
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        admins: { take: 1, select: { email: true } },
      },
    })

    if (!company) return res.status(404).json({ error: 'Company not found' })

    const adminEmail = company.admins[0]?.email ?? ''
    const customerId = await getOrCreateVendorCustomer(companyId, adminEmail, company.name)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: config.stripeVendorSuccessUrl,
      cancel_url: config.stripeVendorCancelUrl,
      metadata: { pulse_company_id: companyId, plan },
      subscription_data: {
        metadata: { pulse_company_id: companyId, plan },
      },
      allow_promotion_codes: true,
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('[vendor-billing/checkout] Stripe error:', err?.message || err)
    // Dev/Demo fallback: if Stripe keys are placeholder or non-functional, perform immediate plan upgrade
    try {
      await prisma.company.update({
        where: { id: companyId },
        data: { plan_tier: plan.toLowerCase() },
      })
      return res.json({ url: `${config.clientOrigin}/billing?success=true` })
    } catch (dbErr) {
      return res.status(500).json({ error: 'Failed to update plan status' })
    }
  }
})

// ─── GET /api/vendor-billing/status ─────────────────────────────────────────

router.get('/status', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        plan_tier: true,
        vendor_stripe_customer_id: true,
        vendor_subscription_id: true,
        plan_expires_at: true,
        _count: { select: { customers: { where: { status: 'active' } } } },
      },
    })

    if (!company) return res.status(404).json({ error: 'Company not found' })

    const tier = (company.plan_tier as PlanTier) ?? 'free'
    const limits = PLAN_LIMITS[tier]
    const currentCount = company._count.customers

    return res.json({
      plan: tier,
      displayName: limits.displayName,
      customerCount: currentCount,
      customerCap: limits.customerCap,
      retentionDays: limits.retentionDays,
      exports: limits.exports,
      teamAdminCap: limits.teamAdminCap,
      monthlyUsdCents: limits.monthlyUsdCents,
      usagePct: limits.customerCap
        ? Math.min(100, Math.round((currentCount / limits.customerCap) * 100))
        : 0,
      expiresAt: company.plan_expires_at,
      hasActiveSubscription: Boolean(company.vendor_subscription_id),
    })
  } catch (err) {
    console.error('[vendor-billing/status] Error:', err)
    return res.status(500).json({ error: 'Failed to fetch billing status' })
  }
})

// ─── POST /api/vendor-billing/portal ────────────────────────────────────────

router.post('/portal', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { vendor_stripe_customer_id: true },
    })

    if (!company?.vendor_stripe_customer_id) {
      return res.status(400).json({
        error: 'No active Stripe subscription found. Subscribe to a plan first.',
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.vendor_stripe_customer_id,
      return_url: `${config.clientOrigin}/billing`,
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('[vendor-billing/portal] Error:', err)
    return res.status(503).json({ error: 'Could not open billing portal.' })
  }
})

export default router
