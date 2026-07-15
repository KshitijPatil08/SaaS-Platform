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
