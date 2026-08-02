import React, { useEffect } from 'react'
import { useHealth, useKpis } from '../hooks/useKpis'
import RetentionRing from '../components/RetentionRing'
import { motion } from 'framer-motion'
import { HeartPulse, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const HealthPage: React.FC = () => {
  const { data: health, isLoading } = useHealth()
  const { data: kpis } = useKpis()

  // Fix #14: page title
  useEffect(() => { document.title = 'Health | Pulse' }, [])

  const customerCount = kpis?.customer_count ?? 0
  const healthPct = health
    ? Math.round((health.distribution.healthy / Math.max(1, customerCount)) * 100)
    : 0

  const DIST = [
    { label: 'Healthy',  value: health?.distribution.healthy  ?? 0, icon: <CheckCircle2 className="h-5 w-5" />, color: 'emerald' },
    { label: 'At Risk',  value: health?.distribution.atRisk   ?? 0, icon: <AlertTriangle className="h-5 w-5" />, color: 'amber' },
    { label: 'Critical', value: health?.distribution.critical ?? 0, icon: <XCircle className="h-5 w-5" />,       color: 'rose' },
  ] as const

  const colorMap = {
    emerald: { card: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    amber:   { card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',         text: 'text-amber-700 dark:text-amber-300',     icon: 'text-amber-500' },
    rose:    { card: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',             text: 'text-rose-700 dark:text-rose-300',       icon: 'text-rose-500' },
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-6 w-6 text-purple-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Health</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time health scores and at-risk account signals
          </p>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DIST.map((d, i) => {
          const c = colorMap[d.color]
          return (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-5 rounded-2xl border ${c.card} flex items-center gap-4`}
            >
              <span className={c.icon}>{d.icon}</span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  {isLoading ? '—' : d.value}
                </p>
                <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${c.text}`}>{d.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Retention ring + at-risk table */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div>
          {customerCount > 0 ? (
            <RetentionRing percentage={healthPct} totalCustomers={customerCount} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-3 min-h-[240px]">
              {/* Fix #7: replaced 🔵 emoji with proper icon and actionable copy */}
              <HeartPulse className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">No health data yet</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">Connect your Stripe webhook and seed customer data to start seeing health scores.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top At-Risk Accounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sorted by lowest health score</p>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-2.5 w-40 bg-slate-100 dark:bg-slate-700/60 rounded" />
                  </div>
                  <div className="h-6 w-12 rounded-full bg-slate-100 dark:bg-slate-700/60" />
                </div>
              ))}
            </div>
          ) : !health?.topAtRisk?.length ? (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
              <p className="text-2xl">🎉</p>
              <p className="text-sm font-medium">No at-risk accounts</p>
              <p className="text-xs">All customers are above the risk threshold</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {health.topAtRisk.map((acc, i) => {
                const score = acc.score
                const scoreColor = score >= 70 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : score >= 40 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                const avatarColors = ['from-rose-500 to-pink-600', 'from-amber-500 to-orange-500', 'from-purple-500 to-indigo-500']
                return (
                  <motion.div
                    key={acc.customer_id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                      {acc.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{acc.name}</p>
                      <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${scoreColor}`}>
                      {score}/100
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HealthPage
