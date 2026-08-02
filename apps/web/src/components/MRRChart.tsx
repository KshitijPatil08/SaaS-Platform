import React, { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMrrSeries, MrrPoint } from '../hooks/useKpis'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MRRData {
  month: string
  mrr: number        // in dollars
  newMRR: number     // in dollars
  churnedMRR: number // in dollars
}

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`

type RangeFilter = '3M' | '6M' | '12M' | 'ALL'

const MRRChart: React.FC = () => {
  const { data: series, isLoading } = useMrrSeries()
  const [range, setRange] = useState<RangeFilter>('12M')

  // Convert cents → dollars for display
  const allData: MRRData[] = (series ?? []).map((p: MrrPoint) => ({
    month: new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    mrr: Math.round(p.mrr / 100),
    newMRR: Math.round((p.newMrr || 0) / 100),
    churnedMRR: Math.round((p.churnedMrr || 0) / 100),
  }))

  const limitMap: Record<RangeFilter, number> = {
    '3M': 3,
    '6M': 6,
    '12M': 12,
    'ALL': 999,
  }

  const data = allData.slice(-limitMap[range])

  const latest = data[data.length - 1]
  const prev = data[data.length - 2]

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10

  const mrrMoM = data.length >= 2 && prev && latest ? pctChange(latest.mrr, prev.mrr) : null
  const newMrrMoM = data.length >= 2 && prev && latest ? pctChange(latest.newMRR, prev.newMRR) : null

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-slate-700 text-xs space-y-1">
          <p className="font-semibold mb-1.5 text-slate-200">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke }} />
                <span className="text-slate-300">{p.name}</span>
              </div>
              <span className="font-mono font-semibold">${p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 animate-pulse h-96">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-64 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center h-80 gap-3">
        <p className="text-2xl">📈</p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No MRR data yet</p>
        <p className="text-xs text-slate-400 text-center max-w-xs">Connect your Stripe account or seed historical data to see your MRR chart.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-6">
      {/* Header stats & range picker */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Monthly Recurring Revenue</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {latest ? `$${latest.mrr.toLocaleString()}` : '—'}
          </p>
          {mrrMoM !== null && (
            <div className="flex items-center gap-1 mt-1">
              {mrrMoM >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
              <span className={`text-xs font-semibold ${mrrMoM >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {mrrMoM >= 0 ? '+' : ''}{mrrMoM}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl gap-0.5">
            {(['3M', '6M', '12M', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  range === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {latest && (
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-blue-600 dark:text-blue-400">New: +${latest.newMRR.toLocaleString()}</span>
              {latest.churnedMRR > 0 && (
                <span className="text-rose-500">Churned: -${latest.churnedMRR.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="newMrrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8B5CF6', strokeWidth: 1, opacity: 0.3 }} />
          <Legend
            wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="mrr"
            name="Total MRR"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            fill="url(#mrrGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }}
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="newMRR"
            name="New MRR"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#newMrrGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="churnedMRR"
            name="Churned MRR"
            stroke="#F43F5E"
            strokeWidth={1.5}
            fill="url(#churnGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MRRChart