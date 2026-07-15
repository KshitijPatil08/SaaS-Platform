import { motion, useVariants } from 'framer-motion'
import { useEffect, useState } from 'react'

interface IKPIProps {
  title: string
  value: number
  change: number
  color: string
  direction: -1 | 1
  variant?: 'light' | 'dark'
}

const KPICard: React.FC<IKPIProps> = ({
  title,
  value,
  change,
  color,
  direction,
  variant = 'light'
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)

  // Animate counter from 0 to value
  useEffect(() => {
    let startTime: number | null = null
    const duration = 1500 // 1.5 seconds

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = Math.sin(progress * Math.PI / 2) // easeOutSine
      setAnimatedValue(Math.floor(easedProgress * value))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    if (value !== animatedValue) {
      window.requestAnimationFrame(step)
    }
  }, [value, animatedValue])

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={`relative group border-t-4 border-${color}/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:border-${color}/100 transition-all duration-300`}
    >
      {/* Animated top border */}
      <div className="absolute top-0 left-0 h-0.5 w-0 bg-${color} transition-all duration-1000 group-hover:w-full" />

      <div className="relative pt-4">
        <h3 className={`
          text-sm font-medium
          ${variant === 'dark' ? 'text-slate-200' : 'text-slate-700'}
          group-hover:text-slate-900/80 dark:group-hover:text-slate-100
          transition-colors duration-300
        `}>
          {title}
        </h3>

        <div className="mt-4 flex items-baseline gap-2">
          <motion.span
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className={`
              text-3xl font-bold
              ${variant === 'dark' ? 'text-slate-100' : 'text-slate-900'}
            `}
          >
            {formatNumber(animatedValue)}
          </motion.span>

          <div className="flex items-baseline space-x-1">
            <span className={`
              text-sm font-medium
              ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              ${variant === 'dark' ? 'text-emerald-400/90' : 'text-emerald-500'}
            `}>
              {direction === 1 ? '▲' : '▼'}
            </span>
            <span className={`
              text-sm font-medium
              ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              ${variant === 'dark' ? 'text-emerald-400/90' : 'text-emerald-500'}
            `}>
              {Math.abs(change)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default KPICard