import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Timer, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

interface TrialExpiry {
  customerId: string
  name: string
  email: string
  mrrCents: number
  trialEndsAt: string
  daysLeft: number
  status: 'expiring_today' | 'expiring_soon' | 'expiring_week' | 'expired'
}

export const TrialExpiryWidget: React.FC = () => {
  const { data: trials, isLoading, isError } = useQuery<TrialExpiry[]>({
    queryKey: ['trial-expiry'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/trial-expiry')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-16 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
        <div className="h-16 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-amber-200 dark:border-amber-800/50 space-y-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-bold">Could not load trial data</p>
        </div>
      </div>
    )
  }

  if (!trials || trials.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Timer className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-bold">Expiring Trials</h3>
        </div>
        <div className="text-center py-6 text-slate-400 dark:text-slate-500">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium">No trials expiring in the next 7 days.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm pb-2 z-10 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Timer className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-bold">Expiring Trials</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
          Next 7 days
        </span>
      </div>

      <div className="space-y-3 pt-2">
        {trials.map((t) => {
          const isExpired = t.daysLeft < 0
          const badgeColor =
            t.status === 'expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
            : t.status === 'expiring_today' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'

          return (
            <div key={t.customerId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800/50 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{t.name}</p>
                <p className="text-xs text-slate-500 truncate max-w-[140px]">{t.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ${(t.mrrCents / 100).toLocaleString()}
                </p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                  {isExpired ? 'Expired' : `${t.daysLeft} days left`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
