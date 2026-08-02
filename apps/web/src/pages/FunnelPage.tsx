import React, { useEffect } from 'react'
import FunnelChart from '../components/FunnelChart'
import { useFunnel, useAccounts, Account } from '../hooks/useKpis'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Zap, PlayCircle, CreditCard, TrendingDown,
  Lightbulb, X, ChevronRight, CheckCircle, Clock, AlertCircle, XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Link } from 'react-router-dom'

// ─── Stage Configuration ─────────────────────────────────────────────────────

type StageName = 'visitors' | 'signups' | 'activations' | 'trials' | 'paid'

const STAGE_META: Array<{
  key: StageName
  label: string
  icon: React.ReactNode
  color: string
  description: string
  statusFilter: string | null  // maps to /api/accounts?status=...
}> = [
  {
    key: 'visitors',
    label: 'Visitors',
    icon: <Users className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Unique visitors who landed on your site',
    statusFilter: null,  // visitors are anonymous
  },
  {
    key: 'signups',
    label: 'Signups',
    icon: <UserPlus className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Visitors who created an account',
    statusFilter: '',  // all registered accounts
  },
  {
    key: 'activations',
    label: 'Activated',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
    description: 'Signups who completed a key action',
    statusFilter: 'active',
  },
  {
    key: 'trials',
    label: 'Trial Started',
    icon: <PlayCircle className="h-5 w-5" />,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400',
    description: 'Activated users who started a paid trial',
    statusFilter: 'trialing',
  },
  {
    key: 'paid',
    label: 'Paid Customer',
    icon: <CreditCard className="h-5 w-5" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    description: 'Trial users who converted to a paid plan',
    statusFilter: 'active',
  },
]

const IMPROVEMENT_TIPS = [
  { stage: 'Visitor → Signup', tip: 'Add social proof (testimonials, customer logos) and reduce form fields to 1–2 inputs.' },
  { stage: 'Signup → Activated', tip: 'Send a "getting started" email within 5 minutes of signup. Make the first success moment fast.' },
  { stage: 'Activated → Trial', tip: 'Surface the upgrade prompt right after the user hits their first value milestone.' },
  { stage: 'Trial → Paid', tip: 'Follow up on day 7 and day 13 of the trial. Offer a 1:1 call for high-intent accounts.' },
]

const statusIconMap: Record<string, React.ReactNode> = {
  active:   <CheckCircle className="h-3 w-3 text-emerald-500" />,
  trialing: <Clock className="h-3 w-3 text-blue-500" />,
  past_due: <AlertCircle className="h-3 w-3 text-amber-500" />,
  canceled: <XCircle className="h-3 w-3 text-rose-500" />,
}

const AVATAR_COLORS = [
  'from-purple-500 to-indigo-600', 'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500',
]

// ─── Stage Drill-Down Drawer ──────────────────────────────────────────────────

interface StageDrillDownProps {
  stage: typeof STAGE_META[number] | null
  onClose: () => void
}

const StageDrillDown: React.FC<StageDrillDownProps> = ({ stage, onClose }) => {
  const isAnonymous = stage?.statusFilter === null
  const { data, isLoading } = useAccounts(1, 20, stage?.statusFilter || undefined, undefined)
  const accounts: Account[] = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  return (
    <AnimatePresence>
      {stage && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${stage.color}`}>{stage.icon}</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{stage.label}</p>
                  <p className="text-xs text-slate-400">{stage.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isAnonymous ? (
                <div className="flex flex-col items-center justify-center h-64 px-8 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="h-7 w-7 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Visitors are anonymous</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Visitor tracking uses page-view analytics — no login required, so there's no individual list.
                      Connect an analytics tool like Plausible or GA4 to see visitor sources.
                    </p>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="p-5 space-y-3 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-2.5 w-44 bg-slate-100 dark:bg-slate-700/60 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <p className="text-sm font-medium">No accounts in this stage yet</p>
                  <p className="text-xs">Customers will appear here as they progress through your funnel.</p>
                </div>
              ) : (
                <div>
                  <div className="px-6 py-3 border-b border-slate-50 dark:border-slate-700/60">
                    <p className="text-xs text-slate-500">
                      Showing top 20 of <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span> accounts in this stage
                    </p>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {accounts.map((acc, i) => (
                      <motion.div
                        key={acc.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {acc.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{acc.name}</p>
                          <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusIconMap[acc.status]}
                          {acc.mrr_cents > 0 && (
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              ${(acc.mrr_cents / 100).toFixed(0)}/mo
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <Link
                to={stage.statusFilter !== null ? `/accounts?status=${stage.statusFilter}` : '/accounts'}
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-2.5 w-full rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                View all in Accounts <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FunnelPage: React.FC = () => {
  const { data, isLoading } = useFunnel()
  const [selectedStage, setSelectedStage] = React.useState<typeof STAGE_META[number] | null>(null)

  useEffect(() => { document.title = 'Funnel | Pulse' }, [])

  const visitors = data?.visitors ?? 0

  return (
    <>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conversion Funnel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track how visitors progress from first visit to paying customers. <span className="text-purple-500 font-medium">Click any stage to see who's in it.</span>
          </p>
        </div>

        {/* Stage stat cards — clickable */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAGE_META.map((stage, i) => {
            const count = data?.[stage.key] ?? 0
            const conversionFromVisitors = visitors > 0 ? ((count / visitors) * 100).toFixed(1) : '—'
            const dropOff = i > 0 && data
              ? Math.max(0, (data[STAGE_META[i - 1].key] ?? 0) - count)
              : null

            return (
              <motion.button
                key={stage.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedStage(stage)}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-100 dark:border-slate-700 text-left hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-purple-100 dark:hover:shadow-purple-900/20 transition-all group cursor-pointer w-full"
              >
                <div className={`inline-flex p-2 rounded-xl ${stage.color} mb-3 group-hover:scale-110 transition-transform`}>
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
                <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-2 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  See who's here <ChevronRight className="h-3 w-3" />
                </p>
              </motion.button>
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

      {/* Stage drill-down drawer */}
      <StageDrillDown stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </>
  )
}

export default FunnelPage
