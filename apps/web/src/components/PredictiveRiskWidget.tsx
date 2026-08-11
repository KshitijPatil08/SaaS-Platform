import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Sparkles, AlertTriangle, ShieldAlert, ChevronRight, Check } from 'lucide-react'

export interface PredictiveChurnResponse {
  forecastedChurnRatePct: number
  atRiskAccountCount: number
  totalAtRiskMrrCents: number
  accounts: Array<{
    customerId: string
    name: string
    email: string
    mrrCents: number
    riskScorePct: number
    horizon: 'Low Risk' | 'Medium Risk' | 'Critical Risk'
    primaryRiskFactor: string
    recommendedAction: string
  }>
}

export const PredictiveRiskWidget: React.FC = () => {
  const { data, isLoading, isError } = useQuery<PredictiveChurnResponse>({
    queryKey: ['predictive-churn'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/predictive-churn')
      return data
    },
    staleTime: 2 * 60 * 1000, // aligned to server's 2-min cache TTL
    retry: 2,
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 animate-pulse space-y-4">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-28 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-amber-200 dark:border-amber-800/50 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">Churn forecast unavailable</p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The predictive churn model could not be loaded. This does not mean your accounts are safe — please check your dashboard manually or try refreshing.
        </p>
      </div>
    )
  }

  const atRiskMrrUsd = Math.round((data?.totalAtRiskMrrCents || 0) / 100)
  const accounts = data?.accounts || []


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Predictive Churn AI Forecast
            </h3>
            <p className="text-xs text-slate-400">Machine learning risk probability horizon (14-30 day forecast)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Forecasted At-Risk MRR</p>
            <p className="text-lg font-extrabold text-rose-500 tabular-nums">${atRiskMrrUsd.toLocaleString()}/mo</p>
          </div>
        </div>
      </div>

      {/* Top At-Risk Accounts Grid */}
      <div className="space-y-2">
        {accounts.slice(0, 4).map((acc, i) => (
          <motion.div
            key={acc.customerId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${acc.riskScorePct >= 70 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{acc.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acc.riskScorePct >= 70 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                    {acc.riskScorePct}% Risk ({acc.horizon})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{acc.primaryRiskFactor}</p>
                <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-0.5">💡 Action: {acc.recommendedAction}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                ${(acc.mrrCents / 100).toFixed(0)}/mo
              </span>
            </div>
          </motion.div>
        ))}

        {accounts.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
            <Check className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            No high-risk churn threats detected in the 30-day forecast!
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictiveRiskWidget
