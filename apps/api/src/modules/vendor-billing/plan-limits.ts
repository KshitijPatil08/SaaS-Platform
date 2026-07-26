/**
 * plan-limits.ts
 *
 * Central definition for every Pulse subscription tier.
 * Import this in the plan-gate middleware, vendor-billing routes, and the
 * API /status endpoint so limits never drift out of sync.
 */

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanLimits {
  customerCap:    number | null   // null = unlimited
  retentionDays:  number | null   // null = unlimited
  exports:        boolean
  teamAdminCap:   number          // max additional admins
  displayName:    string
  monthlyUsdCents: number         // 0 for free
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    customerCap:     50,
    retentionDays:   30,
    exports:         false,
    teamAdminCap:    1,
    displayName:     'Free',
    monthlyUsdCents: 0,
  },
  starter: {
    customerCap:     500,
    retentionDays:   90,
    exports:         true,
    teamAdminCap:    3,
    displayName:     'Starter',
    monthlyUsdCents: 4900,
  },
  pro: {
    customerCap:     5000,
    retentionDays:   365,
    exports:         true,
    teamAdminCap:    10,
    displayName:     'Pro',
    monthlyUsdCents: 14900,
  },
  enterprise: {
    customerCap:     null,
    retentionDays:   null,
    exports:         true,
    teamAdminCap:    Infinity,
    displayName:     'Enterprise',
    monthlyUsdCents: 49900,
  },
}

/** Map a Stripe Price ID → PlanTier. Populated at runtime from env vars. */
export function priceIdToTier(priceId: string, config: {
  stripePriceStarter:    string
  stripePricePro:        string
  stripePriceEnterprise: string
}): PlanTier | null {
  if (priceId === config.stripePriceStarter)    return 'starter'
  if (priceId === config.stripePricePro)        return 'pro'
  if (priceId === config.stripePriceEnterprise) return 'enterprise'
  return null
}

/** Returns true if the company is within their plan's customer cap. */
export function withinCustomerCap(tier: PlanTier, currentCount: number): boolean {
  const cap = PLAN_LIMITS[tier].customerCap
  return cap === null || currentCount <= cap
}
