import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccounts, Account } from '../hooks/useKpis'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, AlertCircle, Clock, XCircle, Search, X,
  CreditCard, Calendar, Mail, Building2, Tag, Activity,
  TrendingUp, ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

type Status = 'active' | 'past_due' | 'canceled' | 'trialing'
type Plan = 'starter' | 'pro' | 'enterprise'

const STATUS_OPTIONS: { value: Status | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
]

const statusConfig: Record<Status, { label: string; icon: React.ReactNode; color: string }> = {
  active:   { label: 'Active',    icon: <CheckCircle className="w-3 h-3" />,  color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  past_due: { label: 'Past Due',  icon: <AlertCircle className="w-3 h-3" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  trialing: { label: 'Trialing',  icon: <Clock className="w-3 h-3" />,       color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  canceled: { label: 'Canceled',  icon: <XCircle className="w-3 h-3" />,     color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400' },
}

const planColor: Record<Plan, string> = {
  starter:    'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
  pro:        'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400',
}

const formatMRR = (cents: number) =>
  cents ? `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'

const AVATAR_COLORS = [
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
]

// ─── Account Detail Slide-Over ────────────────────────────────────────────────

interface AccountDetailPanelProps {
  account: Account | null
  colorIdx: number
  onClose: () => void
}

const AccountDetailPanel: React.FC<AccountDetailPanelProps> = ({ account, colorIdx, onClose }) => {
  const sc = account ? (statusConfig[account.status as Status] ?? statusConfig.active) : null
  const pc = account ? (planColor[account.plan as Plan] ?? planColor.starter) : null
  const initials = account ? account.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : ''

  return (
    <AnimatePresence>
      {account && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{account.name}</p>
                  <p className="text-xs text-slate-400 truncate">{account.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status + Plan badges */}
              <div className="flex gap-2 flex-wrap">
                {sc && (
                  <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full', sc.color)}>
                    {sc.icon} {sc.label}
                  </span>
                )}
                {pc && (
                  <span className={clsx('inline-flex px-3 py-1 text-xs font-semibold rounded-full capitalize', pc)}>
                    {account.plan} Plan
                  </span>
                )}
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Monthly Revenue</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{formatMRR(account.mrr_cents)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Billing Cycle</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 capitalize">{account.billing_cycle || '—'}</p>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Account Details</p>
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/60">
                  <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={account.email} />
                  <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Account Name" value={account.name} />
                  <DetailRow icon={<Tag className="h-3.5 w-3.5" />} label="External ID" value={account.external_id || '—'} />
                  <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Joined" value={new Date(account.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                  {account.trial_ends_at && (
                    <DetailRow
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label="Trial Ends"
                      value={new Date(account.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                  )}
                </div>
              </div>

              {/* Status explanation */}
              <StatusExplanation status={account.status as Status} trialEndsAt={account.trial_ends_at} />
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              <a
                href={`mailto:${account.email}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                <Mail className="h-3.5 w-3.5" /> Email Customer
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5">
    <span className="text-slate-400 shrink-0">{icon}</span>
    <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">{label}</span>
    <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{value}</span>
  </div>
)

const StatusExplanation: React.FC<{ status: Status; trialEndsAt: string | null }> = ({ status, trialEndsAt }) => {
  const info: Record<Status, { color: string; title: string; desc: string; action: string }> = {
    active: {
      color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      title: '✅ Active Paying Customer',
      desc: 'This customer is on a paid subscription and contributing to MRR.',
      action: 'Keep them engaged — send monthly usage summaries and feature updates.',
    },
    trialing: {
      color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
      title: '🔵 Free Trial In Progress',
      desc: trialEndsAt
        ? `Trial ends ${new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
        : 'Customer is actively evaluating your product.',
      action: 'Reach out to help them find value before the trial ends.',
    },
    past_due: {
      color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
      title: '⚠️ Payment Past Due',
      desc: 'Their last payment failed. They may have a card that expired or insufficient funds.',
      action: 'Email them immediately — most past-due accounts recover quickly with a reminder.',
    },
    canceled: {
      color: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
      title: '❌ Canceled Subscription',
      desc: 'This customer is no longer subscribed and is not contributing to MRR.',
      action: 'Send a win-back email after 30 days to offer a discount or a new feature that solves their original problem.',
    },
  }
  const i = info[status] ?? info.active
  return (
    <div className={`rounded-xl border p-4 space-y-1.5 ${i.color}`}>
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{i.title}</p>
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{i.desc}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        <span className="font-semibold">What to do: </span>{i.action}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountsPage: React.FC = () => {
  // URL-state filters so they survive refresh and can be shared
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const statusFilter = (searchParams.get('status') ?? '') as Status | ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const PAGE_SIZE = 10

  const setSearch = (val: string) => setSearchParams(p => { val ? p.set('q', val) : p.delete('q'); p.set('page', '1'); return p }, { replace: true })
  const setStatusFilter = (val: Status | '') => setSearchParams(p => { val ? p.set('status', val) : p.delete('status'); p.set('page', '1'); return p }, { replace: true })
  const setPage = (fn: (p: number) => number) => setSearchParams(p => { p.set('page', String(fn(parseInt(p.get('page') ?? '1', 10)))); return p }, { replace: true })

  // Page title
  useEffect(() => { document.title = 'Accounts | Pulse' }, [])

  const debouncedSearch = useDebouncedValue(search, 300)
  const { data, isLoading } = useAccounts(page, PAGE_SIZE, statusFilter || undefined, debouncedSearch || undefined)

  const accounts: Account[] = data?.data ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1
  const total = pagination?.total ?? 0

  // Selected account for slide-over
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null)
  const [selectedColorIdx, setSelectedColorIdx] = React.useState(0)

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Accounts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {total > 0 ? `${total} customer${total !== 1 ? 's' : ''} tracked — click any row to view details` : 'Manage and filter all customer accounts'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as Status | '')}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Account', 'Plan', 'Status', 'MRR / mo', 'Billing', 'Joined'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="flex gap-3 items-center">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="space-y-1.5"><div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" /><div className="h-2.5 w-36 bg-slate-100 dark:bg-slate-700/60 rounded" /></div>
                      </div></td>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-3 w-16 bg-slate-100 dark:bg-slate-700/60 rounded" /></td>
                      ))}
                    </tr>
                  ))
                )}
                <AnimatePresence mode="popLayout">
                  {!isLoading && accounts.map((account, i) => {
                    const sc = statusConfig[account.status as Status] ?? statusConfig.active
                    const pc = planColor[account.plan as Plan] ?? planColor.starter
                    return (
                      <motion.tr
                        key={account.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => { setSelectedAccount(account); setSelectedColorIdx(i) }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-semibold shrink-0 group-hover:scale-105 transition-transform`}>
                              {getInitials(account.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{account.name}</p>
                              <p className="text-xs text-slate-400 truncate">{account.email}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors ml-auto shrink-0" />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={clsx('inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize', pc)}>
                            {account.plan}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', sc.color)}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatMRR(account.mrr_cents)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {account.billing_cycle}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>

                {!isLoading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                      <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">No accounts match your filters</p>
                      <p className="text-xs mt-1">Try clearing the search or changing the status filter</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      <AccountDetailPanel
        account={selectedAccount}
        colorIdx={selectedColorIdx}
        onClose={() => setSelectedAccount(null)}
      />
    </>
  )
}

export default AccountsPage
