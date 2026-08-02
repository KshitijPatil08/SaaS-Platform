import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface KpiSummary {
  mrr_cents: number
  customer_count: number
  churn_rate: number
}

export function useKpis() {
  return useQuery<KpiSummary>({
    queryKey: ['kpis'],
    queryFn: async () => {
      const { data } = await api.get('/api/kpis')
      return data
    },
  })
}

export interface MrrPoint {
  date: string
  mrr: number
  newMrr: number
  churnedMrr: number
  customerCount: number   // maps to customer_count from the MRRSnapshot; used for customer MoM trend
}

export function useMrrSeries() {
  return useQuery<MrrPoint[]>({
    queryKey: ['mrr'],
    queryFn: async () => {
      const { data } = await api.get('/api/mrr')
      return data
    },
  })
}

export interface HealthData {
  distribution: { healthy: number; atRisk: number; critical: number }
  topAtRisk: Array<{ customer_id: string; name: string; email: string; score: number }>
}

export function useHealth() {
  return useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get('/api/health')
      return data
    },
  })
}

export interface FunnelData {
  visitors: number
  signups: number
  activations: number
  trials: number
  paid: number
  conversionRates: { signup: number; activation: number; trial: number; paid: number }
}

export function useFunnel() {
  return useQuery<FunnelData>({
    queryKey: ['funnel'],
    queryFn: async () => {
      const { data } = await api.get('/api/funnel')
      return data
    },
  })
}

export interface Account {
  id: string
  company_id: string
  external_id: string | null
  email: string
  name: string
  plan: string
  status: string
  mrr_cents: number
  billing_cycle: string
  trial_ends_at: string | null
  created_at: string
}

export interface AccountsResponse {
  data: Account[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function useAccounts(page = 1, pageSize = 10, status?: string, search?: string) {
  return useQuery<AccountsResponse>({
    queryKey: ['accounts', page, pageSize, status, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const { data } = await api.get(`/api/accounts?${params.toString()}`)
      return data
    },
  })
}

export function useAccount(id: string | null) {
  return useQuery<Account>({
    queryKey: ['account', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/accounts/${id}`)
      return data
    },
    enabled: !!id,
  })
}

// ─── Profile — used by Dashboard for real webhookUrl ─────────────────────────

export interface ProfileData {
  companyId: string
  companyName: string
  stripeId: string | null
  admin: { email: string; mfaEnabled: boolean } | null
  webhookUrl: string
}

export function useProfile() {
  return useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/profile')
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — profile doesn't change often
    retry: false,              // don't retry on 401 — auth interceptor handles redirect
  })
}

// ─── Billing Status — cached so SideNav doesn't refetch on every navigation ──

export interface BillingStatus {
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  displayName: string
  customerCount: number
  customerCap: number | null
  retentionDays: number | null
  exports: boolean
  teamAdminCap: number
  monthlyUsdCents: number
  usagePct: number
  expiresAt: string | null
  hasActiveSubscription: boolean
}

export interface CustomerEvent {
  id: string
  name: string
  properties: string
  occurred_at: string
}

export function useAccountEvents(id: string | null) {
  return useQuery<CustomerEvent[]>({
    queryKey: ['account-events', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/accounts/${id}/events`)
      return data
    },
    enabled: !!id,
  })
}

export interface ChurnBreakdown {
  totalLostCents: number
  reasons: Array<{
    reason: string
    count: number
    mrrLostCents: number
    percentage: number
  }>
}

export function useChurnBreakdown() {
  return useQuery<ChurnBreakdown>({
    queryKey: ['churn-breakdown'],
    queryFn: async () => {
      const { data } = await api.get('/api/churn')
      return data
    },
  })
}

export function useBillingStatus() {
  return useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/vendor-billing/status')
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
