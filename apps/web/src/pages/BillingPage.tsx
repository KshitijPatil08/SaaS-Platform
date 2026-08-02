import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAccounts } from '../hooks/useKpis'
import {
  Sparkles, Check, Zap, Shield, Crown, ExternalLink,
  TrendingUp, Users, Calendar, Download, AlertTriangle,
  ChevronRight, Loader2, RefreshCw, ChevronDown, XCircle, Clock, CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingStatus {
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

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_META = {
  free: {
    icon: <Zap className="h-5 w-5" />,
    gradient: 'from-slate-400 to-slate-500',
    ring: 'ring-slate-300 dark:ring-slate-600',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  starter: {
    icon: <TrendingUp className="h-5 w-5" />,
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'ring-blue-400',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  },
  pro: {
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-purple-500 to-indigo-600',
    ring: 'ring-purple-500',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  },
  enterprise: {
    icon: <Crown className="h-5 w-5" />,
    gradient: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
}

const PLANS = [
  {
    key: 'starter' as const,
    name: 'Starter',
    price: '$49',
    period: '/month',
    tagline: 'Essential metrics for early-stage SaaS startups',
    features: [
      'Up to 500 active customers',
      'MRR & Churn tracking',
      '90-day data retention',
      'Basic conversion funnel',
      'CSV data exports',
      'Up to 3 admin users',
    ],
    popular: false,
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$149',
    period: '/month',
    tagline: 'Advanced analytics for growing SaaS teams',
    features: [
      'Up to 5,000 active customers',
      'Real-time account health scoring',
      'Custom funnel tracking',
      '365-day data retention',
      'CSV & PDF exports',
      'Up to 10 admin users',
      'Priority email support',
    ],
    popular: true,
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    tagline: 'Unlimited volume & dedicated support',
    features: [
      'Unlimited active customers',
      'Unlimited data retention',
      'All export formats',
      'Unlimited admin users',
      'Dedicated self-hosted support',
      'Custom SSO & SAML',
      '24/7 SLA & dedicated manager',
    ],
    popular: false,
  },
]

// ─── Usage Meter Bar ─────────────────────────────────────────────────────────

const UsageMeter: React.FC<{ current: number; cap: number | null; pct: number }> = ({
  current, cap, pct,
}) => {
  const color =
    pct >= 90 ? 'bg-rose-500' :
    pct >= 70 ? 'bg-amber-400' :
    'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {current.toLocaleString()} active customers
        </span>
        <span className="text-slate-400">
          {cap ? `of ${cap.toLocaleString()} included` : 'Unlimited'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${cap ? pct : 0}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {pct >= 90 && cap && (
        <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3 w-3" />
          Approaching your plan limit — consider upgrading
        </p>
      )}
    </div>
  )
}

// ─── Customer Cap List ────────────────────────────────────────────────────────

const statusIcon: Record<string, React.ReactNode> = {
  active:   <CheckCircle className="h-3 w-3 text-emerald-500" />,
  trialing: <Clock className="h-3 w-3 text-blue-500" />,
  past_due: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  canceled: <XCircle className="h-3 w-3 text-rose-500" />,
}

const CustomerCapList: React.FC<{ cap: number; current: number }> = ({ cap, current }) => {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useAccounts(1, Math.min(cap, 50))
  const accounts = data?.data ?? []
  const pct = cap ? Math.round((current / cap) * 100) : 0
  const isNearLimit = pct >= 70

  if (!isNearLimit) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${pct >= 90 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'}`}>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {pct >= 90 ? '⚠️ Approaching customer limit' : 'Customer usage'}
            </p>
            <p className="text-xs text-slate-400">
              {current.toLocaleString()} of {cap.toLocaleString()} customers used — {pct}% of your plan cap
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 dark:border-slate-700">
              <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Showing your top {Math.min(cap, 50)} active customers. Upgrade your plan to track more.
                </p>
              </div>
              {isLoading ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-2 w-36 bg-slate-100 dark:bg-slate-700/60 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
                  {accounts.map((acc, i) => (
                    <div key={acc.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {acc.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusIcon[acc.status]}
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {acc.mrr_cents ? `$${(acc.mrr_cents / 100).toFixed(0)}/mo` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BillingPage: React.FC = () => {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Detect Stripe redirect result from URL params
  const params = new URLSearchParams(window.location.search)
  const stripeSuccess = params.get('success') === 'true'
  const stripeCanceled = params.get('canceled') === 'true'

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/vendor-billing/status')
      setStatus(res.data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Poll every 10s when on success landing so plan upgrade appears promptly
    if (stripeSuccess) {
      const t = setInterval(fetchStatus, 10000)
      return () => clearInterval(t)
    }
  }, [fetchStatus, stripeSuccess])

  // Fix #14: page title
  useEffect(() => { document.title = 'Billing | Pulse' }, [])

  const handleSubscribe = async (plan: string) => {
    setCheckoutLoading(plan)
    try {
      const res = await api.post('/api/vendor-billing/checkout', { plan })
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err: any) {
      setToastMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Could not start checkout. Ensure Stripe keys are configured.',
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await api.post('/api/vendor-billing/portal')
      if (res.data?.url) window.open(res.data.url, '_blank')
    } catch (err: any) {
      setToastMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Could not open billing portal.',
      })
    } finally {
      setPortalLoading(false)
    }
  }

  const currentPlan = status?.plan ?? 'free'
  const meta = TIER_META[currentPlan]

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Subscription & Billing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your Pulse plan, usage limits, and payment details.
        </p>
      </div>

      {/* Stripe redirect toasts */}
      <AnimatePresence>
        {stripeSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm font-medium"
          >
            <Check className="h-5 w-5 shrink-0" />
            <span className="flex-1">Payment successful! Your plan is being activated — this page will update automatically.</span>
            {/* Fix #6: visible polling feedback so users know sync is in progress */}
            <span className="flex items-center gap-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400 shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing plan status…
            </span>
          </motion.div>
        )}
        {stripeCanceled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm font-medium"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Checkout was canceled. No charges were made.
          </motion.div>
        )}
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
            }`}
          >
            {toastMsg.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Plan Card */}
      {loading ? (
        <div className="h-44 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse" />
      ) : status ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border-2 ${meta.ring} relative overflow-hidden`}
        >
          {/* Decorative gradient blob */}
          <div className={`absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-2xl`} />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-lg`}>
                  {meta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {status.displayName} Plan
                    </h2>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${meta.badge}`}>
                      Active
                    </span>
                  </div>
                  {status.monthlyUsdCents > 0 ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                      ${(status.monthlyUsdCents / 100).toFixed(0)}/month
                      {status.expiresAt && (
                        <> · Cancels {new Date(status.expiresAt).toLocaleDateString()}</>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Free tier — no charge</p>
                  )}
                </div>
              </div>

              <UsageMeter
                current={status.customerCount}
                cap={status.customerCap}
                pct={status.usagePct}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  {
                    icon: <Users className="h-3.5 w-3.5" />,
                    label: 'Customer Cap',
                    value: status.customerCap ? status.customerCap.toLocaleString() : 'Unlimited',
                  },
                  {
                    icon: <Calendar className="h-3.5 w-3.5" />,
                    label: 'Data Retention',
                    value: status.retentionDays ? `${status.retentionDays} days` : 'Unlimited',
                  },
                  {
                    icon: <Download className="h-3.5 w-3.5" />,
                    label: 'Data Exports',
                    value: status.exports ? 'Enabled' : 'Unavailable',
                  },
                  {
                    icon: <Shield className="h-3.5 w-3.5" />,
                    label: 'Team Admins',
                    value: status.teamAdminCap === Infinity ? 'Unlimited' : `Up to ${status.teamAdminCap}`,
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      {icon}
                      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => fetchStatus()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
              {status.hasActiveSubscription && (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                >
                  {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                  Manage Subscription
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm">
          Could not load billing status. Make sure you're signed in and the API is running.
        </div>
      )}

      {/* Customer Cap List — only shown when usage >= 70% */}
      {status?.customerCap && (
        <CustomerCapList cap={status.customerCap} current={status.customerCount} />
      )}

      {/* Plan Upgrade Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {currentPlan === 'free' ? 'Choose a Plan' : 'Upgrade or Switch Plan'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          All plans include full dashboard access, MRR tracking, churn analytics, and Stripe webhook integration.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = plan.key === currentPlan
            const meta = TIER_META[plan.key]

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative flex flex-col rounded-2xl p-6 border-2 shadow-lg transition-all duration-200 ${
                  plan.popular
                    ? 'border-purple-500 bg-purple-900/5 dark:bg-purple-950/30'
                    : isCurrent
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5">
                    <Check className="h-3 w-3" /> Current Plan
                  </div>
                )}

                <div className="mb-5">
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow mb-3`}>
                    {meta.icon}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{plan.price}</span>
                    <span className="text-xs text-slate-400">{plan.period}</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${plan.popular ? 'text-purple-500' : 'text-emerald-500'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={isCurrent || checkoutLoading === plan.key}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                  }`}
                >
                  {checkoutLoading === plan.key ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting to Stripe…
                    </>
                  ) : isCurrent ? (
                    <>
                      <Check className="h-4 w-4" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      Subscribe to {plan.name}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* FAQ / Notes */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 text-xs space-y-2 text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-3">Billing notes</p>
        <p>• All plans are billed monthly. Annual billing (with discount) coming soon.</p>
        <p>• Upgrade takes effect immediately. Downgrade takes effect at the end of the current billing period.</p>
        <p>• Usage limits (customer cap) are measured against active customers only — canceled/churned customers don't count.</p>
        <p>• Data is retained for your plan's window. Downgrading to Free trims data older than 30 days.</p>
        <p>• Questions? <a href="mailto:support@pulseanalytics.io" className="text-purple-500 hover:underline">support@pulseanalytics.io</a></p>
      </div>
    </div>
  )
}

export default BillingPage
