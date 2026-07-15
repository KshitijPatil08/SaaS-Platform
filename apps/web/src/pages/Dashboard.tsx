import React from 'react'
import { motion } from 'framer-motion'
import KPICard from '../components/KPICard'
import MRRChart from '../components/MRRChart'
import FunnelChart from '../components/FunnelChart'
import RetentionRing from '../components/RetentionRing'
import AccountsTable from '../components/AccountsTable'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const Dashboard: React.FC = () => {
  const kpiData = [
    { title: 'MRR', value: 45478, change: 12.8, color: 'purple-600', direction: 1 as const },
    { title: 'Customers', value: 1824, change: 8.2, color: 'blue-600', direction: 1 as const },
    { title: 'Churn Rate', value: 5.6, change: -2.1, color: 'rose-600', direction: -1 as const },
    { title: 'ARPU', value: 24.87, change: 4.5, color: 'emerald-600', direction: 1 as const },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 p-6 max-w-screen-2xl mx-auto"
    >
      {/* Header */}
      <motion.h1 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Analytics Dashboard
      </motion.h1>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {kpiData.map((kpi) => (
          <motion.div key={kpi.title} variants={itemVariants}>
            <KPICard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      {/* MRR Chart */}
      <motion.div variants={itemVariants}>
        <MRRChart />
      </motion.div>

      {/* Funnel Chart + Retention Ring */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FunnelChart />
        </div>
        <div>
          <RetentionRing />
        </div>
      </motion.div>

      {/* Accounts Table */}
      <motion.div variants={itemVariants}>
        <AccountsTable />
      </motion.div>
    </motion.div>
  )
}

export default Dashboard