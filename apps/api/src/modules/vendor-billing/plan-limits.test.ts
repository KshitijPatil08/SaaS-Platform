/**
 * plan-limits.test.ts
 *
 * Unit tests for plan tier definitions and limit helpers.
 * Pure logic — no DB, no network. Runs in < 5ms.
 */
import { describe, it, expect } from 'vitest'
import {
  PLAN_LIMITS,
  withinCustomerCap,
  priceIdToTier,
  type PlanTier,
} from './plan-limits'

// ── PLAN_LIMITS shape ─────────────────────────────────────────────────────────

describe('PLAN_LIMITS', () => {
  const tiers: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']

  it('defines all four tiers', () => {
    for (const tier of tiers) {
      expect(PLAN_LIMITS[tier]).toBeDefined()
    }
  })

  it('free tier has the most restrictive caps', () => {
    const free = PLAN_LIMITS.free
    expect(free.customerCap).toBe(50)
    expect(free.retentionDays).toBe(30)
    expect(free.exports).toBe(false)
    expect(free.teamAdminCap).toBe(1)
  })

  it('enterprise tier has unlimited caps (null)', () => {
    const enterprise = PLAN_LIMITS.enterprise
    expect(enterprise.customerCap).toBeNull()
    expect(enterprise.retentionDays).toBeNull()
    expect(enterprise.exports).toBe(true)
  })

  it('starter < pro < enterprise for customer caps', () => {
    const { starter, pro } = PLAN_LIMITS
    expect(starter.customerCap!).toBeLessThan(pro.customerCap!)
  })

  it('monthly price increases with tier', () => {
    const { free, starter, pro, enterprise } = PLAN_LIMITS
    expect(free.monthlyUsdCents).toBe(0)
    expect(starter.monthlyUsdCents).toBeGreaterThan(0)
    expect(pro.monthlyUsdCents).toBeGreaterThan(starter.monthlyUsdCents)
    expect(enterprise.monthlyUsdCents).toBeGreaterThan(pro.monthlyUsdCents)
  })
})

// ── withinCustomerCap ─────────────────────────────────────────────────────────

describe('withinCustomerCap', () => {
  it('allows 0 customers on every tier', () => {
    expect(withinCustomerCap('free', 0)).toBe(true)
    expect(withinCustomerCap('starter', 0)).toBe(true)
    expect(withinCustomerCap('pro', 0)).toBe(true)
    expect(withinCustomerCap('enterprise', 0)).toBe(true)
  })

  it('allows exactly at the cap (inclusive)', () => {
    expect(withinCustomerCap('free', 50)).toBe(true)
    expect(withinCustomerCap('starter', 500)).toBe(true)
    expect(withinCustomerCap('pro', 5000)).toBe(true)
  })

  it('rejects one over the cap', () => {
    expect(withinCustomerCap('free', 51)).toBe(false)
    expect(withinCustomerCap('starter', 501)).toBe(false)
    expect(withinCustomerCap('pro', 5001)).toBe(false)
  })

  it('enterprise is always within cap (unlimited)', () => {
    expect(withinCustomerCap('enterprise', 1_000_000)).toBe(true)
  })
})

// ── priceIdToTier ─────────────────────────────────────────────────────────────

describe('priceIdToTier', () => {
  const mockConfig = {
    stripePriceStarter:    'price_starter_abc',
    stripePricePro:        'price_pro_xyz',
    stripePriceEnterprise: 'price_ent_123',
  }

  it('maps known price IDs to correct tiers', () => {
    expect(priceIdToTier('price_starter_abc', mockConfig)).toBe('starter')
    expect(priceIdToTier('price_pro_xyz', mockConfig)).toBe('pro')
    expect(priceIdToTier('price_ent_123', mockConfig)).toBe('enterprise')
  })

  it('returns null for unknown price IDs', () => {
    expect(priceIdToTier('price_unknown_zzz', mockConfig)).toBeNull()
    expect(priceIdToTier('', mockConfig)).toBeNull()
  })

  it('is case-sensitive (Stripe IDs are)', () => {
    expect(priceIdToTier('PRICE_STARTER_ABC', mockConfig)).toBeNull()
  })
})
