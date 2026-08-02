import React from 'react'
import { motion } from 'framer-motion'
import { useCohorts } from '../hooks/useKpis'
import { Users, Grid } from 'lucide-react'

// Color map for cohort retention heatmap percentages
function getHeatmapBg(pct: number): string {
  if (pct >= 85) return 'bg-purple-600 text-white font-bold'
  if (pct >= 70) return 'bg-purple-500/80 text-white font-semibold'
  if (pct >= 55) return 'bg-purple-400/60 text-purple-950 dark:text-purple-100 font-semibold'
  if (pct >= 40) return 'bg-purple-300/40 text-purple-900 dark:text-purple-200'
  if (pct >= 25) return 'bg-purple-200/30 text-purple-800 dark:text-purple-300'
  return 'bg-purple-100/20 text-slate-400'
}

const CohortHeatmap: React.FC = () => {
  const { data, isLoading } = useCohorts()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 animate-pulse space-y-4">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-48 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    )
  }

  const months = data?.months ?? ['M0', 'M1', 'M2', 'M3', 'M4', 'M5']
  const grid = data?.grid ?? []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Grid className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cohort Retention Heatmap</h3>
            <p className="text-xs text-slate-400">Percentage of active accounts retained over time by signup month</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-2 px-3 text-left font-bold">Cohort</th>
              <th className="py-2 px-3 text-center font-bold">Size</th>
              {months.map((m) => (
                <th key={m} className="py-2 px-3 font-bold">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {grid.map((row, i) => (
              <motion.tr
                key={row.month}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <td className="py-2.5 px-3 text-left font-semibold text-slate-800 dark:text-slate-200">
                  {row.month}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                  {row.size}
                </td>
                {row.retention.map((pct, idx) => (
                  <td key={idx} className="p-1">
                    <div className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all ${getHeatmapBg(pct)}`}>
                      {pct}%
                    </div>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CohortHeatmap
