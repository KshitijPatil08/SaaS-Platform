import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMrrSeries, MrrPoint } from '../hooks/useKpis'

interface MRRData {
  month: string
  mrr: number
  newMRR: number
}

const MRRChart: React.FC = () => {
  const { data: series, isLoading } = useMrrSeries()
  const [hoveredMonth, setHoveredMonth] = useState<MRRData | null>(null)

  const data: MRRData[] = (series ?? []).map((p: MrrPoint) => ({
    month: new Date(p.date).toLocaleDateString('en-US', { month: 'short' }),
    mrr: p.mrr,
    newMRR: p.newMrr,
  }))

  const calculateTotalMRR = () => {
    return data.reduce((sum, item) => sum + item.mrr, 0)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthData = payload[0].payload as MRRData

      return (
        <div className="bg-slate-900/95 backdrop-blur-sm text-slate-100 rounded-xl p-4 shadow-2xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">{label}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600" />
                <span className="text-sm text-slate-300">MRR</span>
              </div>
              <span className="text-sm font-mono text-slate-100">${payload[0].value.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-sm text-slate-300">New MRR</span>
              </div>
              <span className="text-sm font-mono text-slate-100">${payload[1].value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const formatAxis = (value: number) => `$${(value / 1000).toFixed(0)}k`

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
      {isLoading && <p className="text-sm text-slate-500 mb-4">Loading MRR…</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Monthly Recurring Revenue</h3>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">${calculateTotalMRR().toLocaleString()}+</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total over period</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Current MRR</h3>
          <p className="text-3xl font-bold text-purple-600">${data.length ? data[data.length - 1].mrr.toLocaleString() : 0}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">+4.6% from last month</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">New MRR</h3>
          <p className="text-3xl font-bold text-blue-600">${data.length ? data[data.length - 1].newMRR.toLocaleString() : 0}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">+2.1% from last month</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onMouseMove={(state) => {
            if (state.activeLabel) {
              const monthData = data.find(d => d.month === state.activeLabel)
              setHoveredMonth(monthData || null)
            }
          }}
        >
          <defs>
            <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="5%" stopColor="rgba(124, 58, 237, 0.3)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="rgba(124, 58, 237, 0.05)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="newMRRGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="5%" stopColor="rgba(59, 130, 246, 0.3)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="rgba(59, 130, 246, 0.05)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', opacity: 0.6 }}
            className="text-sm"
          />
          <YAxis
            tickFormatter={formatAxis}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', opacity: 0.6 }}
            className="text-sm"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.1 }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <Line
            type="monotone"
            dataKey="mrr"
            name="MRR"
            stroke="rgba(124, 58, 237, 1)"
            strokeWidth={3}
            fill="url(#mrrGradient)"
            dot={{ r: 4, fill: 'rgba(124, 58, 237, 1)', stroke: 'currentColor', strokeWidth: 1, opacity: 0.8 }}
            activeDot={{ r: 6, fill: 'rgba(124, 58, 237, 1)', stroke: 'currentColor', strokeWidth: 2, opacity: 1 }}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />

          <Line
            type="monotone"
            dataKey="newMRR"
            name="New MRR"
            stroke="rgba(59, 130, 246, 1)"
            strokeWidth={3}
            fill="url(#newMRRGradient)"
            dot={{ r: 4, fill: 'rgba(59, 130, 246, 1)', stroke: 'currentColor', strokeWidth: 1, opacity: 0.8 }}
            activeDot={{ r: 6, fill: 'rgba(59, 130, 246, 1)', stroke: 'currentColor', strokeWidth: 2, opacity: 1 }}
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MRRChart