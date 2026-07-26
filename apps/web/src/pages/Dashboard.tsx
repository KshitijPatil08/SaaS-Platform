import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Settings, Download, RefreshCw, AlertCircle } from 'lucide-react';
import KPICard from '../components/KPICard';
import MRRChart from '../components/MRRChart';
import FunnelChart from '../components/FunnelChart';
import RetentionRing from '../components/RetentionRing';
import AccountsTable from '../components/AccountsTable';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { useKpis, useHealth, useMrrSeries } from '../hooks/useKpis';
import { api } from '../lib/api';

const KPI_CONFIGS = [
  {
    title: 'Monthly Recurring Revenue',
    colorClass: 'from-purple-500 to-indigo-600',
    borderColor: 'linear-gradient(90deg, #8B5CF6, #6366F1)',
    format: 'currency' as const,
  },
  {
    title: 'Active Customers',
    colorClass: 'from-blue-500 to-cyan-500',
    borderColor: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
    format: 'count' as const,
  },
  {
    title: '30-Day Churn Rate',
    colorClass: 'from-rose-500 to-pink-600',
    borderColor: 'linear-gradient(90deg, #F43F5E, #EC4899)',
    format: 'percent' as const,
  },
  {
    title: 'Customer Health',
    colorClass: 'from-emerald-500 to-teal-500',
    borderColor: 'linear-gradient(90deg, #10B981, #14B8A6)',
    format: 'percent' as const,
  },
]

const Dashboard: React.FC = () => {
  const { data: kpis, isLoading, error, refetch } = useKpis();
  const { data: health } = useHealth();
  const { data: mrrSeries } = useMrrSeries();
  const [exporting, setExporting] = useState(false);

  const mrrCents = kpis?.mrr_cents ?? 0;
  const customerCount = kpis?.customer_count ?? 0;
  const churnRate = kpis?.churn_rate ?? 0;
  const healthPct = health
    ? Math.round((health.distribution.healthy / Math.max(1, customerCount)) * 100)
    : 0;

  // Month-over-month from MRR series
  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;

  const mrrChange =
    mrrSeries && mrrSeries.length >= 2
      ? pctChange(mrrSeries.at(-1)!.mrr, mrrSeries.at(-2)!.mrr)
      : 0;
  const customerChange =
    mrrSeries && mrrSeries.length >= 2
      ? pctChange(mrrSeries.at(-1)!.customerCount, mrrSeries.at(-2)!.customerCount)
      : 0;

  // Values: MRR converted to dollars for display, all others raw
  const kpiValues = [
    { value: mrrCents / 100, change: mrrChange, direction: (mrrChange >= 0 ? 1 : -1) as 1 | -1 },
    { value: customerCount, change: customerChange, direction: (customerChange >= 0 ? 1 : -1) as 1 | -1 },
    { value: churnRate, change: churnRate, direction: -1 as const },
    { value: healthPct, change: healthPct, direction: 1 as const },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/api/export?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulse-mrr-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shadow-md shadow-purple-500/20"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load metrics. Make sure you're logged in and the API is running.</span>
        </div>
      )}

      {/* Onboarding Banner when no customers exist */}
      {customerCount === 0 && (
        <OnboardingBanner
          webhookUrl="http://localhost:5000/webhooks/stripe"
          onDataSeeded={() => refetch()}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CONFIGS.map((cfg, i) => (
          <motion.div
            key={cfg.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <KPICard
              {...cfg}
              {...kpiValues[i]}
            />
          </motion.div>
        ))}
      </div>

      {/* Charts row — MRR full width, then Funnel + Retention side by side */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <MRRChart />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <FunnelChart />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {customerCount === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 min-h-[240px]">
              <p className="text-2xl">🔵</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No retention data</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">Retention data appears once customers and health scores are available.</p>
            </div>
          ) : (
            <RetentionRing percentage={healthPct} totalCustomers={customerCount} />
          )}
        </motion.div>
      </div>

      {/* Accounts table — full width */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <AccountsTable />
      </motion.div>
    </div>
  );
};

export default Dashboard;
