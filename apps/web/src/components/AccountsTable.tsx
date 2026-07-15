import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { useAccounts, Account } from '../hooks/useKpis'

type Plan = 'starter' | 'pro' | 'enterprise'
type Status = 'active' | 'past_due' | 'canceled' | 'trialing'

const formatMRR = (cents: number) => {
  if (!cents) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100)
}

const getStatusConfig = (status: Status) => {
  const configs: Record<Status, { label: string; icon: typeof CheckCircle; color: string }> = {
    active: { label: 'Active', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    past_due: { label: 'Past Due', icon: AlertCircle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    trialing: { label: 'Trialing', icon: Clock, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    canceled: { label: 'Canceled', icon: AlertCircle, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
  }
  return configs[status]
}

const getPlanConfig = (plan: Plan) => {
  const configs: Record<Plan, { color: string; borderColor: string }> = {
    starter: { color: 'text-slate-600 bg-slate-100 dark:bg-slate-700', borderColor: 'border-slate-300' },
    pro: { color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', borderColor: 'border-purple-300' },
    enterprise: { color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30', borderColor: 'border-indigo-300' },
  }
  return configs[plan]
}

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30'
  if (score >= 50) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
  return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30'
}

const AccountsTable: React.FC = () => {
  const [filter, setFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const rowsPerPage = 5

  const { data, isLoading } = useAccounts(page, rowsPerPage, undefined, filter || undefined)
  const accounts: Account[] = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Accounts</h3>
        <input
          type="text"
          placeholder="Search accounts..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading && <p className="px-6 py-4 text-sm text-slate-500">Loading accounts…</p>}
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {['Account', 'Plan', 'Status', 'MRR', 'Joined'].map((label) => (
                <th
                  key={label}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <AnimatePresence mode="popLayout">
              {accounts.map((account, index) => (
                <motion.tr
                  key={account.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{account.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{account.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getPlanConfig((account.plan as Plan)).color,
                        getPlanConfig((account.plan as Plan)).borderColor
                      )}
                    >
                      {account.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const config = getStatusConfig(account.status as Status)
                      const StatusIcon = config.icon
                      return (
                        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', config.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {formatMRR(account.mrr_cents)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, data?.pagination.total ?? 0)} of {data?.pagination.total ?? 0} accounts
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountsTable