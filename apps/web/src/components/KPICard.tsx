import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface IKPIProps {
  title: string
  value: number
  change: number
  color: string
  direction: -1 | 1
  variant?: 'light' | 'dark'
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const KPICard: React.FC<IKPIProps> = ({
  title,
  value,
  change,
  color,
  direction,
  variant = 'light',
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const duration = 1500

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = Math.sin((progress * Math.PI) / 2) // easeOutSine
      setAnimatedValue(eased * value)
      if (progress < 1) window.requestAnimationFrame(step)
    }

    window.requestAnimationFrame(step)
  }, [value])

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className="relative group rounded-xl p-6 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t-4 hover:scale-[1.02] transition-transform duration-200"
      style={{ borderTopColor: `var(--${color})` }}
    >
      <h3
        className={`text-sm font-medium ${
          variant === 'dark' ? 'text-slate-200' : 'text-slate-700'
        } group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors`}
      >
        {title}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <motion.span
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className={`text-3xl font-bold ${
            variant === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}
        >
          {formatNumber(animatedValue)}
        </motion.span>

        <span
          className={`text-sm font-medium ${
            change >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {direction === 1 ? '▲' : '▼'} {Math.abs(change)}%
        </span>
      </div>
    </motion.div>
  )
}

export default KPICard
