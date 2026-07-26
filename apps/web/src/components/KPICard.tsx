import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface IKPIProps {
  title: string
  value: number
  change: number
  direction: -1 | 1
  format?: 'currency' | 'percent' | 'count'
  colorClass: string   // e.g. 'from-purple-500 to-indigo-600'
  borderColor: string  // e.g. '#8B5CF6'
}

const formatValue = (num: number, format: IKPIProps['format']) => {
  if (format === 'currency') {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}k`
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (format === 'percent') return `${num.toFixed(1)}%`
  if (num >= 1_000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return num.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

const KPICard: React.FC<IKPIProps> = ({
  title,
  value,
  change,
  direction,
  format = 'count',
  colorClass,
  borderColor,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const duration = 1400

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)  // easeOutCubic
      setAnimatedValue(eased * value)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [value])

  const isPositive = change >= 0
  const changeColor = direction === 1
    ? (isPositive ? 'text-emerald-500' : 'text-rose-500')
    : (isPositive ? 'text-rose-500' : 'text-emerald-500')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative group rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Colored top border */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
        style={{ background: borderColor }}
      />

      {/* Background glow */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${colorClass} opacity-10 group-hover:opacity-20 transition-opacity`}
      />

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
          {formatValue(animatedValue, format)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className={`h-3.5 w-3.5 ${changeColor}`} />
        ) : (
          <TrendingDown className={`h-3.5 w-3.5 ${changeColor}`} />
        )}
        <span className={`text-xs font-semibold ${changeColor}`}>
          {isPositive ? '+' : ''}{Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">vs last month</span>
      </div>
    </motion.div>
  )
}

export default KPICard
