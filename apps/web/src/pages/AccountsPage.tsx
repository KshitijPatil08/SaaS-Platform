import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccounts, Account, useAccountEvents } from '../hooks/useKpis'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, AlertCircle, Clock, XCircle, Search, X,
  CreditCard, Calendar, Mail, Building2, Tag, Activity,
  TrendingUp, ExternalLink, RefreshCw, Check
} from 'lucide-react'
import { clsx } from 'clsx'
import CustomerTimeline from '../components/CustomerTimeline'
import SegmentFilter, { SegmentType } from '../components/SegmentFilter'
import CustomerNotes from '../components/CustomerNotes'
import { api } from '../lib/api'

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
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
]

interface DetailPanelProps {
  account: Account | null
  colorIdx: number
  onClose: () => void
}

const AccountDetailPanel: React.FC<DetailPanelProps> = ({ account, colorIdx, onClose }) => {
  const [tab, setTab] = React.useState<'details' | 'events'>('details')
  const { data: events, isLoading: eventsLoading } = useAccountEvents(account?.id ?? null)
  const [recovering, setRecovering] = useState(false)
  const [recoveredMsg, setRecoveredMsg] = useState<string | null>(null)

  useEffect(() => {
    setTab('details')
    setRecoveredMsg(null)
  }, [account?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!account) return null

  const avatarGradient = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]
  const initials = account.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  const handleTriggerRecovery = async () => {
    setRecovering(true)
    try {
      const res = await api.post('/api/dunning/recover', { customerId: account.id })
      setRecoveredMsg(res.data?.message || 'Payment recovered successfully!')
    } catch {
      setRecoveredMsg('Failed to recover payment.')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <AnimatePresence>
      {account && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl border-l border-slate-100 dark:border-slate-800 flex flex-col"
          >
            {/* Panel Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-base shadow-md shadow-purple-500/20 shrink-0`}>
                  {initials}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{account.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{account.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Pill Bar */}
            <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">MRR</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{formatMRR(account.mrr_cents)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Plan</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 capitalize">{account.plan}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Health</p>
                <p className={`text-sm font-extrabold tabular-nums ${account.health_score >= 70 ? 'text-emerald-500' : account.health_score >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {account.health_score}/100
                </p>
              </div>
            </div>

            {/* Recovery Alert Banner if Past Due */}
            {account.status === 'past_due' && (
              <div className="mx-6 mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Dunning: Payment Past Due
                  </span>
                  <button onClick={handleTriggerRecovery} disabled={recovering} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700">
                    {recovering ? 'Recovering…' : 'Recover MRR'}
                  </button>
                </div>
                {recoveredMsg && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{recoveredMsg}</p>}
              </div>
            )}

            {/* Tab selector */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-2">
              <button
                onClick={() => setTab('details')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 mr-6 ${
                  tab === 'details'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Account Overview
              </button>
              <button
                onClick={() => setTab('events')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  tab === 'events'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                360° Journey Timeline {events?.length ? `(${events.length})` : ''}
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {tab === 'details' ? (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</p>
                    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/60">
                      <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={account.email} />
                      <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Account Name" value={account.name} />
                      <DetailRow icon={<Tag className="h-3.5 w-3.5" />} label="External ID" value={account.external_id || '—'} />
                      <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Joined" value={new Date(account.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                      {account.trial_ends_at && (
                        <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Trial Ends" value={new Date(account.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                      )}
                    </div>
                  </div>
                  <StatusExplanation status={account.status as Status} trialEndsAt={account.trial_ends_at || null} />

                  {/* Internal CRM Notes Panel */}
                  <div className="pt-2">
                    <CustomerNotes customerId={account.id} />
                  </div>
                </>
              ) : (
                <CustomerTimeline events={events || []} customerName={account.name} />
              )}
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
    <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0 font-medium">{label}</span>
    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">{value}</span>
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

// ─── Main Accounts Page Component ─────────────────────────────────────────────

const AccountsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const statusFilter = (searchParams.get('status') ?? '') as Status | ''
  const [activeSegment, setActiveSegment] = useState<SegmentType>('all')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const PAGE_SIZE = 10

  const setSearch = (val: string) => setSearchParams(p => { val ? p.set('q', val) : p.delete('q'); p.set('page', '1'); return p }, { replace: true })
  const setStatusFilter = (val: Status | '') => setSearchParams(p => { val ? p.set('status', val) : p.delete('status'); p.set('page', '1'); return p }, { replace: true })
  const setPage = (fn: (p: number) => number) => setSearchParams(p => { p.set('page', String(fn(parseInt(p.get('page') ?? '1', 10)))); return p }, { replace: true })

  useEffect(() => { document.title = 'Accounts | Pulse' }, [])

  const debouncedSearch = useDebouncedValue(search, 300)

  // Map Segment filter choices to API params
  const effectiveStatus = activeSegment === 'past_due' ? 'past_due' : activeSegment === 'trialing' ? 'trialing' : statusFilter || undefined
  const { data, isLoading } = useAccounts(page, PAGE_SIZE, effectiveStatus, undefined, debouncedSearch || undefined)

  let accounts: Account[] = data?.data ?? []

  // Client-side Segment Filter refinements for Enterprise ($500+) and At-Risk
  if (activeSegment === 'enterprise') {
    accounts = accounts.filter(a => (a.mrr_cents || 0) >= 50000)
  } else if (activeSegment === 'at_risk') {
    accounts = accounts.filter(a => (a.health_score || 100) < 40)
  }

  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1
  const total = pagination?.total ?? 0

  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null)
  const [selectedColorIdx, setSelectedColorIdx] = React.useState(0)

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Accounts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage customer accounts, track subscription health, and recover past-due revenue.
          </p>
        </div>
      </div>

      {/* Segment Filter Bar */}
      <SegmentFilter
        activeSegment={activeSegment}
        onSelectSegment={(seg) => {
          setActiveSegment(seg)
          setPage(() => 1)
        }}
      />

      {/* Search and Filters bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, email, or external ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Status | '')}
          className="w-full sm:w-44 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/80 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 hidden sm:table-cell">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">MRR</th>
                <th className="py-3 px-4 text-center hidden md:table-cell">Health</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-4 hidden sm:table-cell"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 hidden md:table-cell"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : !accounts.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching customer accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((acc, i) => {
                  const s = statusConfig[acc.status as Status] ?? statusConfig.active
                  const pColor = planColor[acc.plan as Plan] ?? planColor.starter
                  const initials = getInitials(acc.name)
                  const gradient = AVATAR_COLORS[i % AVATAR_COLORS.length]

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => { setSelectedAccount(acc); setSelectedColorIdx(i) }}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors">{acc.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{acc.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${pColor}`}>
                          {acc.plan}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${s.color}`}>
                          {s.icon} {s.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMRR(acc.mrr_cents)}
                      </td>

                      <td className="py-3.5 px-4 text-center hidden md:table-cell font-bold text-slate-700 dark:text-slate-300">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          acc.health_score >= 70
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : acc.health_score >= 40
                            ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {acc.health_score}/100
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button className="text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-1 ml-auto">
                          View 360° <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {accounts.length} of {total} accounts</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Detail Slide-over Panel */}
      <AccountDetailPanel
        account={selectedAccount}
        colorIdx={selectedColorIdx}
        onClose={() => setSelectedAccount(null)}
      />
    </div>
  )
}

export default AccountsPage
