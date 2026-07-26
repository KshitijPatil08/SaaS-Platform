import React from 'react'
import { motion } from 'framer-motion'
import { useFunnel, FunnelData } from '../hooks/useKpis'
import { Users, UserPlus, Zap, PlayCircle, CreditCard } from 'lucide-react'

interface FunnelStage {
  stage: string
  key: string
  count: number
  percentage: number
  color: string
  icon: React.ReactNode
}

const STAGES_CONFIG = [
  { key: 'visitors',   stage: 'Visitors',        color: '#8B5CF6', icon: <Users className="h-4 w-4" /> },
  { key: 'signups',    stage: 'Signups',          color: '#6D28D9', icon: <UserPlus className="h-4 w-4" /> },
  { key: 'activations',stage: 'Activated',        color: '#5B21B6', icon: <Zap className="h-4 w-4" /> },
  { key: 'trials',     stage: 'Trial Started',    color: '#4C1D95', icon: <PlayCircle className="h-4 w-4" /> },
  { key: 'paid',       stage: 'Paid Customer',    color: '#2E1065', icon: <CreditCard className="h-4 w-4" /> },
]

const FunnelChart: React.FC = () => {
  const { data, isLoading } = useFunnel()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 animate-pulse">
        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        {[100, 80, 60, 40, 20].map((w, i) => (
          <div key={i} className="mb-4 space-y-1">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-700/40" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    )
  }

  const allZero = !data || (data.visitors === 0 && data.paid === 0)

  if (allZero) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 min-h-[240px]">
        <p className="text-2xl">📊</p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No conversion data captured yet</p>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Your conversion pipeline automatically populates as visitors progress from signup to paid subscription.
        </p>
      </div>
    )
  }

  const visitors = data!.visitors || 1  // avoid division by 0
  const stages: FunnelStage[] = STAGES_CONFIG.map(cfg => {
    const count = data![cfg.key as keyof FunnelData] as number
    const percentage = Math.round((count / visitors) * 100)
    return { ...cfg, count, percentage }
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-6">Conversion Funnel</h3>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span style={{ color: stage.color }}>{stage.icon}</span>
                <span className="font-medium">{stage.stage}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <span className="font-semibold tabular-nums">{stage.count.toLocaleString()}</span>
                <span className="text-slate-400 w-10 text-right">{stage.percentage}%</span>
              </div>
            </div>

            <div className="relative h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(stage.percentage, 2)}%` }}
                transition={{ duration: 1.0, delay: index * 0.1, ease: 'easeOut' }}
                className="h-full rounded-lg opacity-90"
                style={{ background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color})` }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Conversion summary */}
      {data && data.visitors > 0 && data.paid > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Overall Visitor → Paid Conversion Rate</span>
            <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">
              {((data.paid / data.visitors) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default FunnelChart