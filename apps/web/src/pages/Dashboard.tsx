import React from 'react';
import { motion } from 'framer-motion';
import SideNav from '../components/SideNav';
import KPICard from '../components/KPICard';
import MRRChart from '../components/MRRChart';
import FunnelChart from '../components/FunnelChart';
import RetentionRing from '../components/RetentionRing';
import AccountsTable from '../components/AccountsTable';
import { useKpis, useHealth } from '../hooks/useKpis';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

const Dashboard: React.FC = () => {
  const { data: kpis, isLoading } = useKpis();
  const { data: health } = useHealth();

  const mrrCents = kpis?.mrr_cents ?? 0;
  const customerCount = kpis?.customer_count ?? 0;
  const churnRate = kpis?.churn_rate ?? 0;
  const healthPct = health
    ? Math.round((health.distribution.healthy / Math.max(1, customerCount)) * 100)
    : 0;

  const kpiCards = [
    { title: 'MRR', value: mrrCents ? Number(formatCurrency(mrrCents).replace(/[^0-9.]/g, '')) : 0, change: 12.8, color: 'purple-600', direction: 1 as const },
    { title: 'Customers', value: customerCount, change: 8.2, color: 'blue-600', direction: 1 as const },
    { title: 'Churn Rate', value: churnRate, change: -2.1, color: 'rose-600', direction: -1 as const },
    { title: 'Health Score', value: healthPct, change: 4.5, color: 'emerald-600', direction: 1 as const },
  ];

  return (
    <>
      <SideNav />
      <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pulse Analytics</h1>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              Settings
            </button>
            <button className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              Export
            </button>
          </div>
        </header>

        {isLoading && (
          <p className="text-sm text-slate-500 mb-4">Loading live data…</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, i) => (
              <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <KPICard {...kpi} />
              </motion.div>
            ))}
          </div>

          <motion.div key="mrr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="h-96">
              <MRRChart />
            </div>
          </motion.div>
          <motion.div key="funnel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <FunnelChart />
          </motion.div>
          <motion.div key="retention" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <RetentionRing percentage={healthPct || 87} />
          </motion.div>

          <motion.div key="accounts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <AccountsTable />
          </motion.div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
