import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, RefreshCw, AlertCircle, Clock, Activity, ChevronRight } from 'lucide-react';
import KPICard from '../components/KPICard';
import MRRChart from '../components/MRRChart';
import FunnelChart from '../components/FunnelChart';
import RetentionRing from '../components/RetentionRing';
import AccountsTable from '../components/AccountsTable';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { useKpis, useHealth, useMrrSeries, useProfile } from '../hooks/useKpis';
import { api } from '../lib/api';

const KPI_CONFIGS = [
  {
    title: 'Monthly Recurring Revenue',
    colorClass: 'from-purple-500 to-indigo-600',
    borderColor: 'linear-gradient(90deg, #8B5CF6, #6366F1)',
    format: 'currency' as const,
    linkTo: '/accounts',
  },
  {
    title: 'Active Customers',
    colorClass: 'from-blue-500 to-cyan-500',
    borderColor: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
    format: 'count' as const,
    linkTo: '/accounts?status=active',
  },
  {
    title: '30-Day Churn Rate',
    colorClass: 'from-rose-500 to-pink-600',
    borderColor: 'linear-gradient(90deg, #F43F5E, #EC4899)',
    format: 'percent' as const,
    linkTo: '/accounts?status=canceled',
  },
  {
    title: 'Customer Health',
    colorClass: 'from-emerald-500 to-teal-500',
    borderColor: 'linear-gradient(90deg, #10B981, #14B8A6)',
    format: 'percent' as const,
    linkTo: '/health',
  },
]

/** Returns a human-readable "X min ago" label */
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const Dashboard: React.FC = () => {
  const { data: kpis, isLoading, error, refetch, dataUpdatedAt } = useKpis();
  const { data: health } = useHealth();
  const { data: mrrSeries } = useMrrSeries();
  // Fix #4: get real webhookUrl from profile API instead of hardcoding localhost
  const { data: profile } = useProfile();
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0); // forces re-render of timeAgo every 30s

  // Fix #3: track when data was last refreshed
  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  // Re-render timeAgo label every 30s so it stays current
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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

  // Fix #10: health KPI passes change: 0 — healthPct itself is not a delta vs last month
  const kpiValues = [
    { value: mrrCents / 100, change: mrrChange, direction: (mrrChange >= 0 ? 1 : -1) as 1 | -1 },
    { value: customerCount, change: customerChange, direction: (customerChange >= 0 ? 1 : -1) as 1 | -1 },
    { value: churnRate, change: churnRate, direction: -1 as const },
    { value: healthPct, change: 0, direction: 1 as const },
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

  const handleRefresh = () => {
    refetch();
    setLastUpdated(new Date());
  };

  // Fix #4: use real webhook URL from profile API (not localhost)
  const webhookUrl = profile?.webhookUrl ?? '';

  // Fix #14: page title
  useEffect(() => { document.title = 'Dashboard | Pulse' }, []);

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

        {/* Fix #2: Export CSV is now the primary (purple) action; Settings link removed from header */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Fix #3: last-updated timestamp */}
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 select-none">
              <Clock className="h-3.5 w-3.5" />
              Updated {timeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow-md shadow-purple-500/20 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
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
      {!isLoading && customerCount === 0 && webhookUrl && (
        <OnboardingBanner
          webhookUrl={webhookUrl}
          onDataSeeded={() => refetch()}
        />
      )}

      {/* KPI Cards — each links to a relevant detail page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CONFIGS.map((cfg, i) => (
          <motion.div
            key={cfg.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link to={cfg.linkTo} className="block group">
              <KPICard
                {...cfg}
                {...kpiValues[i]}
              />
            </Link>
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
        {/* Funnel chart with drill-down link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
          <FunnelChart />
          <Link
            to="/funnel"
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline pl-1"
          >
            View full funnel breakdown <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Retention ring with drill-down link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-2">
          {customerCount === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 min-h-[240px]">
              <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No retention data</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">Retention data appears once customers and health scores are available.</p>
            </div>
          ) : (
            <RetentionRing percentage={healthPct} totalCustomers={customerCount} />
          )}
          <Link
            to="/health"
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline pl-1"
          >
            View account health details <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* Accounts table — full width */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <AccountsTable />
        <div className="mt-2 pl-1">
          <Link
            to="/accounts"
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
          >
            View all accounts <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
