import React from 'react'
import FunnelChart from '../components/FunnelChart'

const FunnelPage: React.FC = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conversion Funnel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor user conversion rates from visitors to paid subscribers.
        </p>
      </div>

      <div className="max-w-4xl">
        <FunnelChart />
      </div>
    </div>
  )
}

export default FunnelPage
