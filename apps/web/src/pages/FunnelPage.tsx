import React, { useEffect } from 'react'
import FunnelChart from '../components/FunnelChart'
import { useFunnel } from '../hooks/useKpis'
import { motion } from 'framer-motion'
import { Users, UserPlus, Zap, PlayCircle, CreditCard, TrendingDown, Lightbulb } from 'lucide-react'

const STAGE_META = [
  {
    key: 'visitors' as const,
    label: 'Visitors',
    icon: <Users className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Unique visitors who landed on your site',
  },
  {
    key: 'signups' as const,
    label: 'Signups',
    icon: <UserPlus className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Visitors who created an account',
  },
  {
    key: 'activations' as const,
    label: 'Activated',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
    description: 'Signups who completed a key action',
  },
  {
    key: 'trials' as const,
    label: 'Trial Started',
    icon: <PlayCircle className="h-5 w-5" />,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400',
    description: 'Activated users who started a paid trial',
  },
  {
    key: 'paid' as const,
    label: 'Paid Customer',
    icon: <CreditCard className="h-5 w-5" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    description: 'Trial users who converted to a paid plan',
  },
]

const IMPROVEMENT_TIPS = [
  { stage: 'Visitor → Signup', tip: 'Add social proof (testimonials, customer logos) and reduce form fields to 1–2 inputs.' },
  { stage: 'Signup → Activated', tip: 'Send a "getting started" email within 5 minutes of signup. Make the first success moment fast.' },
  { stage: 'Activated → Trial', tip: 'Surface the upgrade prompt right after the user hits their first value milestone.' },
  { stage: 'Trial → Paid', tip: 'Follow up on day 7 and day 13 of the trial. Offer a 1:1 call for high-intent accounts.' },
]

const FunnelPage: React.FC = () => {
  const { data, isLoading } = useFunnel()

  // Fix #14: page title
  useEffect(() => { document.title = 'Funnel | Pulse' }, [])

  const visitors = data?.visitors ?? 0

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conversion Funnel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track how visitors progress from first visit to becoming paying customers — and where they drop off.
        </p>
      </div>

      {/* Stage stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAGE_META.map((stage, i) => {
          const count = data?.[stage.key] ?? 0
          const conversionFromVisitors = visitors > 0 ? ((count / visitors) * 100).toFixed(1) : '—'
          const dropOff = i > 0 && data
            ? Math.max(0, (data[STAGE_META[i - 1].key] ?? 0) - count)
            : null

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-100 dark:border-slate-700"
            >
              <div className={`inline-flex p-2 rounded-xl ${stage.color} mb-3`}>
                {stage.icon}
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {isLoading ? '—' : count.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{stage.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{conversionFromVisitors}% of visitors</p>
              {dropOff !== null && dropOff > 0 && (
                <p className="flex items-center gap-1 text-[11px] text-rose-500 mt-1.5 font-medium">
                  <TrendingDown className="h-3 w-3" />
                  {dropOff.toLocaleString()} dropped off
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* The main funnel chart */}
      <FunnelChart />

      {/* Stage explanations */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">What each stage means</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STAGE_META.map(stage => (
            <div key={stage.key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
              <span className={`p-1.5 rounded-lg ${stage.color} shrink-0 mt-0.5`}>{stage.icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{stage.label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stage.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement tips */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-purple-100 dark:border-purple-900/40 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-purple-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">How to improve your funnel</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IMPROVEMENT_TIPS.map((tip, i) => (
            <div key={i} className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-3.5 border border-purple-100 dark:border-purple-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-1">{tip.stage}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FunnelPage
