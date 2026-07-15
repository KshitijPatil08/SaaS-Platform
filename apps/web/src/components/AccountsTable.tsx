import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, User, CreditCard, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

interface Account {
  id: string
  name: string
  email: string
  plan: 'Starter' | 'Pro' | 'Enterprise'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  mrr: number
  lastLogin: string
  healthScore: number
}

const mockAccounts: Account[] = [
  { id: 'acc_001', name: 'Acme Corp', email: 'contact@acme.com', plan: 'Enterprise', status: 'active', mrr: 49900, lastLogin: '2 min ago', healthScore: 94 },
  { id: 'acc_002', name: 'TechStart Inc', email: 'hello@techstart.io', plan: 'Pro', status: 'active', mrr: 29900, lastLogin: '15 min ago', healthScore: 87 },
  { id: 'acc_003', name: 'DesignHub', email: 'team@designhub.co', plan: 'Pro', status: 'active', mrr: 14900, lastLogin: '1 hour ago', healthScore: 72 },
  { id: 'acc_004', name: 'DataFlow Labs', email: 'ops@dataflow.ai', plan: 'Starter', status: 'past_due', mrr: 4900, lastLogin: '3 days ago', healthScore: 45 },
  { id: 'acc_005', name: 'CloudNine', email: 'support@cloudnine.dev', plan: 'Enterprise', status: 'active', mrr: 89900, lastLogin: '30 min ago', healthScore: 91 },
  { id: 'acc_006', name: 'SwiftShip', email: 'contact@swiftship.com', plan: 'Starter', status: 'trialing', mrr: 0, lastLogin: '5 hours ago', healthScore: 68 },
  { id: 'acc_007', name: 'BrightMind', email: 'hello@brightmind.org', plan: 'Pro', status: 'canceled', mrr: 0, lastLogin: '12 days ago', healthScore: 12 },
  { id: 'acc_008', name: 'NexaPoint', email: 'team@nexapoint.io', plan: 'Enterprise', status: 'active', mrr: 149900, lastLogin: '10 min ago', healthScore: 96 },
  { id: 'acc_009', name: 'OrbitOps', email: 'ops@orbitops.tech', plan: 'Pro', status: 'active', mrr: 24900, lastLogin: '45 min ago', healthScore: 79 },
  { id: 'acc_010', name: 'VelocityVault', email: 'security@velocityvault.com', plan: 'Starter', status: 'past_due', mrr: 4900, lastLogin: '2 days ago', healthScore: 38 },
]

const formatMRR = (cents: number) => {
  if (cents === 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100)
}

const getStatusConfig = (status: Account['status']) => {
  const configs = {
    active: { label: 'Active', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', dotColor: 'bg-emerald-500' },
    past_due: { label: 'Past Due', icon: AlertCircle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', dotColor: 'bg-amber-500' },
    trialing: { label: 'Trialing', icon: Clock, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', dotColor: 'bg-blue-500' },
    canceled: { label: 'Canceled', icon: AlertCircle, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30', dotColor: 'bg-rose-500' },
  }
  return configs[status]
}

const getPlanConfig = (plan: Account['plan']) => {
  const configs = {
    Starter: { color: 'text-slate-600 bg-slate-100 dark:bg-slate-700', borderColor: 'border-slate-300' },
    Pro: { color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', borderColor: 'border-purple-300' },
    Enterprise: { color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30', borderColor: 'border-indigo-300' },
  }
  return configs[plan]
}

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30'
  if (score >= 50) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
  return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30'
}

const AccountsTable: React.FC = () => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Account; direction: 'asc' | 'desc' } | null>({ key: 'mrr', direction: 'desc' })
  const [filter, setFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const rowsPerPage = 5

  const handleSort = (key: keyof Account) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const filteredAccounts = mockAccounts
    .filter(account =>
      account.name.toLowerCase().includes(filter.toLowerCase()) ||
      account.email.toLowerCase().includes(filter.toLowerCase()) ||
      account.plan.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig) return 0
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

  const paginatedAccounts = filteredAccounts.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const totalPages = Math.ceil(filteredAccounts.length / rowsPerPage)

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
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {[
                { key: 'name', label: 'Account' },
                { key: 'plan', label: 'Plan' },
                { key: 'status', label: 'Status' },
                { key: 'mrr', label: 'MRR' },
                { key: 'healthScore', label: 'Health' },
                { key: 'lastLogin', label: 'Last Login' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof Account)}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortConfig?.key === key && (
                      <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <AnimatePresence mode="popLayout">
              {paginatedAccounts.map((account, index) => (
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
                        getPlanConfig(account.plan).color,
                        getPlanConfig(account.plan).borderColor
                      )}
                    >
                      {account.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    const config = getStatusConfig(account.status)
                    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', config.color)}>
                      <config.icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {formatMRR(account.mrr)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-xs h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${account.healthScore}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                        />
                      </div>
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', getHealthColor(account.healthScore))}>
                        {account.healthScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {account.lastLogin}
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
          Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredAccounts.length)} of {filteredAccounts.length} accounts
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