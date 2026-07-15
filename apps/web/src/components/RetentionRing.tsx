import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface RetentionRingProps {
  percentage?: number
  size?: number
}

const RetentionRing: React.FC<RetentionRingProps> = ({
  percentage = 87,
  size = 160
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const duration = 2000

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setAnimatedPercentage(Math.floor(easedProgress * percentage))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }, [percentage])

  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedPercentage / 100) * circumference

  const center = size / 2

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col items-center justify-center">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 self-start">Customer Retention</h3>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Foreground ring */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-3xl font-bold text-slate-900 dark:text-slate-100"
          >
            {animatedPercentage}%
          </motion.span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Retention</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-center w-full">
        <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">{Math.round(percentage * 18.24)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Retained</p>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
          <p className="text-2xl font-bold text-rose-600">{Math.round((100 - percentage) * 18.24)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Churned</p>
        </div>
      </div>
    </div>
  )
}

export default RetentionRing