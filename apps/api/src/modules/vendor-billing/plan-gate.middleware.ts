/**
 * plan-gate.middleware.ts
 *
 * Enforces plan-level usage caps on protected API routes.
 * Attach to any route that should be gated by the company's subscription tier.
 *
 * Returns HTTP 402 Payment Required when a company exceeds its cap, with a
 * structured JSON body the frontend can render as an upgrade prompt.
 */

import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../shared/lib/prisma'
import { PLAN_LIMITS, withinCustomerCap } from './plan-limits'
import type { PlanTier } from './plan-limits'

/**
 * Blocks requests when the company's active customer count exceeds their
 * plan's customer cap.
 *
 * Usage:
 *   app.use('/api/kpis', verifyJwt, planGate, kpisRouter)
 */
export async function planGate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const companyId = req.companyId
  if (!companyId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        plan_tier: true,
        _count: { select: { customers: { where: { status: 'active' } } } },
      },
    })

    if (!company) {
      res.status(401).json({ error: 'Company not found' })
      return
    }

    const tier = (company.plan_tier as PlanTier) ?? 'free'
    const currentCount = company._count.customers
    const limits = PLAN_LIMITS[tier]

    if (!withinCustomerCap(tier, currentCount)) {
      res.status(402).json({
        error: 'Plan limit exceeded',
        code: 'PLAN_LIMIT_EXCEEDED',
        plan: tier,
        limit: limits.customerCap,
        current: currentCount,
        upgradeUrl: '/billing',
        message: `Your ${limits.displayName} plan supports up to ${limits.customerCap} active customers. You currently have ${currentCount}. Upgrade to continue.`,
      })
      return
    }

    // Attach plan metadata to request for downstream use (optional)
    ;(req as any).planTier = tier
    ;(req as any).planLimits = limits

    next()
  } catch (err) {
    console.error('[planGate] Error checking plan limits:', err)
    // Fail open — don't block traffic on a DB hiccup
    next()
  }
}

/**
 * Blocks data export routes when the company's plan doesn't include exports.
 */
export async function exportGate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const companyId = req.companyId
  if (!companyId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan_tier: true },
    })

    const tier = ((company?.plan_tier) as PlanTier) ?? 'free'
    const limits = PLAN_LIMITS[tier]

    if (!limits.exports) {
      res.status(402).json({
        error: 'Export not available on your plan',
        code: 'EXPORT_PLAN_GATE',
        plan: tier,
        upgradeUrl: '/billing',
        message: `CSV/PDF exports are available on Starter, Pro, and Enterprise plans. Upgrade from the Billing page.`,
      })
      return
    }

    next()
  } catch {
    next()
  }
}
