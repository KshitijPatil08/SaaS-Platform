import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Align client-side stale time with server cache TTL (server caches for 60s).
// Using 55s ensures the client re-fetches just before the server cache expires.
// refetchOnWindowFocus: false prevents 6 simultaneous API calls on every tab switch.
const KPI_QUERY_OPTS = {
  staleTime: 55 * 1000,
  refetchOnWindowFocus: false,
} as const

export interface KpiSummary {
  mrr_cents: number
  customer_count: number
  churn_rate: number
  arpu_cents?: number
  ltv_cents?: number
  quick_ratio?: number
}

export function useKpis() {
  return useQuery<KpiSummary>({
    queryKey: ['kpis'],
    queryFn: async () => {
      const { data } = await api.get('/api/kpis')
      return data
    },
    ...KPI_QUERY_OPTS,
  })
}

export interface MrrPoint {
  date: string
  mrr: number
  newMrr: number
  expansionMrr: number
  contractionMrr: number
  churnedMrr: number
  customerCount: number
}

export function useMrrSeries() {
  return useQuery<MrrPoint[]>({
    queryKey: ['mrr'],
    queryFn: async () => {
      const { data } = await api.get('/api/mrr')
      return data
    },
    ...KPI_QUERY_OPTS,
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
    ...KPI_QUERY_OPTS,
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
    ...KPI_QUERY_OPTS,
  })
}

export interface Account {
  id: string
  external_id: string
  name: string
  email: string
  plan: string
  status: string
  mrr_cents: number
  health_score: number
  created_at: string
  billing_cycle?: string
  trial_ends_at?: string | null
}

export interface AccountsResponse {
  data: Account[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useAccounts(page = 1, pageSize = 10, status?: string, plan?: string, search?: string) {
  return useQuery<AccountsResponse>({
    queryKey: ['accounts', page, pageSize, status, plan, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (status) params.set('status', status)
      if (plan) params.set('plan', plan)
      if (search) params.set('search', search)
      const { data } = await api.get(`/api/accounts?${params.toString()}`)
      return data
    },
    staleTime: 30 * 1000, // accounts list changes more often — 30s stale time
    refetchOnWindowFocus: false,
  })
}

export interface AccountEvent {
  id: string
  name: string
  created_at: string
  occurred_at?: string
  payload: Record<string, any> | null
}

export function useAccountEvents(accountId: string | null) {
  return useQuery<AccountEvent[]>({
    queryKey: ['account-events', accountId],
    queryFn: async () => {
      if (!accountId) return []
      const { data } = await api.get(`/api/accounts/${accountId}/events`)
      return data
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export interface ChurnReasonBreakdown {
  totalLostCents: number
  reasons: Array<{
    reason: string
    count: number
    mrrLostCents: number
    percentage: number
  }>
}

export function useChurnBreakdown() {
  return useQuery<ChurnReasonBreakdown>({
    queryKey: ['churn-breakdown'],
    queryFn: async () => {
      const { data } = await api.get('/api/churn/breakdown')
      return data
    },
    ...KPI_QUERY_OPTS,
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/profile')
      return data
    },
    staleTime: 5 * 60 * 1000, // profile rarely changes — 5 min stale time
    refetchOnWindowFocus: false,
  })
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ['vendor-billing-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/vendor-billing/status')
      return data
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export interface CohortsData {
  months: string[]
  grid: Array<{
    month: string
    size: number
    retention: number[]
  }>
}

export function useCohorts() {
  return useQuery<CohortsData>({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/cohorts')
      return data
    },
    ...KPI_QUERY_OPTS,
  })
}
