import React, { useEffect, useState } from 'react'
import { useHealth, useKpis, useChurnBreakdown } from '../hooks/useKpis'
import RetentionRing from '../components/RetentionRing'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HeartPulse, AlertTriangle, CheckCircle2, XCircle, ChevronDown,
  Mail, TrendingUp, Phone, Lightbulb, Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// ─── Score helpers ────────────────────────────────────────────────────────────

function getScoreTier(score: number): 'healthy' | 'at_risk' | 'critical' {
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

const TIER_INFO = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    reason: 'This account is in good standing — engaged, paid up, and showing positive product activity.',
    action: 'Schedule a quarterly check-in to explore expansion opportunities (upsell/cross-sell).',
    actionIcon: <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />,
  },
  at_risk: {
    label: 'At Risk',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    bar: 'bg-amber-400',
    reason: 'This account shows warning signals — reduced engagement, overdue payment, or nearing trial end without conversion.',
    action: 'Reach out within 48 hours. A brief personal email or call can dramatically improve retention here.',
    actionIcon: <Phone className="h-3.5 w-3.5 shrink-0 text-amber-500" />,
  },
  critical: {
    label: 'Critical',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400',
    bar: 'bg-rose-500',
    reason: 'This account is at high churn risk — severe disengagement, payment failures, or multiple consecutive issues detected.',
    action: 'Escalate immediately. Offer a discount, a feature walkthrough, or a dedicated onboarding session to re-engage.',
    actionIcon: <Mail className="h-3.5 w-3.5 shrink-0 text-rose-500" />,
  },
}

// ─── At-Risk Row (expandable) ─────────────────────────────────────────────────

interface AtRiskRowProps {
  acc: { customer_id: string; name: string; email: string; score: number }
  index: number
  isExpanded: boolean
  onToggle: () => void
}

const AtRiskRow: React.FC<AtRiskRowProps> = ({ acc, index, isExpanded, onToggle }) => {
  const tier = getScoreTier(acc.score)
  const info = TIER_INFO[tier]
  const avatarColors = ['from-rose-500 to-pink-600', 'from-amber-500 to-orange-500', 'from-purple-500 to-indigo-500']

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
          {acc.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{acc.name}</p>
          <p className="text-xs text-slate-400 truncate">{acc.email}</p>
        </div>

        {/* Score bar + badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 hidden sm:block">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${info.bar}`}
                style={{ width: `${acc.score}%` }}
              />
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${info.color}`}>
            {acc.score}/100
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </motion.div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-5 mb-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
              {/* Score explanation */}
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Why {acc.score >= 70 ? 'healthy' : acc.score >= 40 ? 'at risk' : 'critical'}?
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {info.reason}
                  </p>
                </div>
              </div>

              {/* Action recommendation */}
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                {info.actionIcon}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Recommended action</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {info.action}
                  </p>
                </div>
              </div>

              {/* Quick email action */}
              <a
                href={`mailto:${acc.email}?subject=Checking in from Pulse`}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline mt-1"
              >
                <Mail className="h-3.5 w-3.5" /> Email {acc.name.split(' ')[0]} directly
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Score Explanation Card ───────────────────────────────────────────────────

const ScoreExplanationCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
    <div className="flex items-center gap-2">
      <Lightbulb className="h-4 w-4 text-purple-500" />
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">How health scores work</h3>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
      Each customer receives a score from 0–100 based on payment history, product engagement, and billing status.
      Scores update automatically as customer data changes via your Stripe webhook.
    </p>
    <div className="grid grid-cols-3 gap-2 pt-1">
      {(['healthy', 'at_risk', 'critical'] as const).map(tier => {
        const info = TIER_INFO[tier]
        const range = tier === 'healthy' ? '70–100' : tier === 'at_risk' ? '40–69' : '0–39'
        return (
          <div key={tier} className={`rounded-lg p-2.5 ${info.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide">{info.label}</p>
            <p className="text-xs font-extrabold tabular-nums">{range}</p>
          </div>
        )
      })}
    </div>
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

const HealthPage: React.FC = () => {
  const { data: health, isLoading } = useHealth()
  const { data: kpis } = useKpis()
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
            Real-time health scores and at-risk account signals. <span className="text-purple-500 font-medium">Click any row to see why and what to do.</span>
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

      {/* Score explanation card */}
      <ScoreExplanationCard />

      {/* Retention ring + at-risk table */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div>
          {customerCount > 0 ? (
            <RetentionRing percentage={healthPct} totalCustomers={customerCount} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-3 min-h-[240px]">
              <HeartPulse className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">No health data yet</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">Connect your Stripe webhook and seed customer data to start seeing health scores.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top At-Risk Accounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sorted by lowest health score — click to expand reason & action</p>
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
              {health.topAtRisk.map((acc, i) => (
                <AtRiskRow
                  key={acc.customer_id}
                  acc={acc}
                  index={i}
                  isExpanded={expandedId === acc.customer_id}
                  onToggle={() => setExpandedId(expandedId === acc.customer_id ? null : acc.customer_id)}
                />
              ))}
            </div>
          )}

          {/* Footer link to full accounts */}
          {(health?.topAtRisk?.length ?? 0) > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700">
              <Link
                to="/accounts?status=past_due"
                className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
              >
                View all past-due accounts &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Churn Reason Breakdown */}
        <ChurnBreakdownSection />
      </div>
    </div>
  )
}

function ChurnBreakdownSection() {
  const { data: churn, isLoading } = useChurnBreakdown()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!churn?.reasons?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 text-center text-slate-400">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-semibold">No churn events recorded</p>
        <p className="text-xs mt-1">Churn reasons will appear here when customers cancel.</p>
      </div>
    )
  }

  const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Churn Reason Breakdown</p>
          <p className="text-xs text-slate-400 mt-0.5">Total lost MRR: <span className="font-semibold text-rose-500">{fmtUsd(churn.totalLostCents)}/mo</span></p>
        </div>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-700/60">
        {churn.reasons.map((r) => (
          <div key={r.reason} className="px-5 py-3.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 capitalize">{r.reason.replace(/_/g, ' ')}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-700"
                  style={{ width: `${r.percentage}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-rose-500">{fmtUsd(r.mrrLostCents)}/mo</p>
              <p className="text-[11px] text-slate-400">{r.count} {r.count === 1 ? 'account' : 'accounts'} · {r.percentage}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HealthPage
