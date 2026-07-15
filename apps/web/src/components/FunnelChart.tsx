import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FunnelStage {
  stage: string
  count: number
  percentage: number
  color: string
}

const funnelData: FunnelStage[] = [
  { stage: 'Visitors', count: 56240, percentage: 100, color: '#8B5CF6' },
  { stage: 'Signups', count: 12840, percentage: 22.8, color: '#7C3AED' },
  { stage: 'Activated', count: 6420, percentage: 11.4, color: '#6D28D9' },
  { stage: 'Trial Users', count: 3210, percentage: 5.7, color: '#5B21B6' },
  { stage: 'Paid Customers', count: 1824, percentage: 3.2, color: '#4C1D95' },
]

const FunnelChart: React.FC = () => {
  const [animatedStages, setAnimatedStages] = useState<FunnelStage[]>(
    funnelData.map(stage => ({ ...stage, count: 0 }))
  )

  React.useEffect(() => {
    const animate = () => {
      let step = 0
      const interval = setInterval(() => {
        if (step >= 100) {
          clearInterval(interval)
          return
        }
        step += 2
        setAnimatedStages(funnelData.map(stage => ({
          ...stage,
          count: Math.floor(stage.count * step / 100)
        })))
      }, 30)
    }
    animate()
  }, [])

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Conversion Funnel</h3>

      <div className="space-y-4">
        {animatedStages.map((stage, index) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{stage.stage}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatNumber(stage.count)}</span>
            </div>
            <div className="relative h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stage.percentage}%` }}
                transition={{ duration: 1.2, delay: index * 0.15, ease: 'easeOut' }}
                className="h-full rounded-l-lg transition-all duration-1000"
                style={{ backgroundColor: stage.color }}
              />
              <div className="absolute inset-0 flex items-center justify-end pr-4">
                <span className="text-xs font-semibold text-white drop-shadow-lg">
                  {stage.percentage}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Alternative: Horizontal bar chart with Recharts */}
      <ResponsiveContainer width="100%" height={280} className="mt-8">
        <BarChart data={animatedStages} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ display: false }} />
          <YAxis
            dataKey="stage"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12 }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
            }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar
            dataKey="count"
            radius={[8, 0, 0, 8]}
            maxBarSize={40}
          >
            {animatedStages.map((stage, index) => (
              <Cell key={`cell-${index}`} fill={stage.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default FunnelChart