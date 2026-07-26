import React from 'react'
import RetentionRing from '../components/RetentionRing'
import { useHealth, useKpis } from '../hooks/useKpis'

const HealthPage: React.FC = () => {
  const { data: health, isLoading } = useHealth()
  const { data: kpis } = useKpis()

  const customerCount = kpis?.customer_count ?? 0
  const healthPct = health
    ? Math.round((health.distribution.healthy / Math.max(1, customerCount)) * 100)
    : 0

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Health & Risk Analysis</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed breakdown of customer health scores, risk signals, and retention metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <RetentionRing percentage={healthPct} totalCustomers={customerCount} />
        </div>

        <div className="md:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Health Breakdown</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Healthy</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {health?.distribution.healthy ?? 0}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">At Risk</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {health?.distribution.atRisk ?? 0}
              </p>
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">Critical</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {health?.distribution.critical ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Top At-Risk Accounts</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading health data…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Health Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {health?.topAtRisk.map((acc) => (
                  <tr key={acc.customer_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{acc.name}</td>
                    <td className="px-4 py-3">{acc.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-600 dark:text-rose-400">
                        {acc.score} / 100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthPage
