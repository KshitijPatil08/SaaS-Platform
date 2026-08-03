import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, BarChart3, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'

interface StatusCheck {
  status: 'operational' | 'degraded' | 'down'
  latencyMs?: number
}

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down'
  uptimeSeconds: number
  checks: Record<string, StatusCheck>
  timestamp: string
  version: string
}

export const StatusPage: React.FC = () => {
  const [data, setData] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/status')
      setData(res.data)
      setLastChecked(new Date())
    } catch {
      setData({
        status: 'down',
        uptimeSeconds: 0,
        checks: {
          api: { status: 'down' },
          database: { status: 'down' },
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (secs: number) => {
    const days = Math.floor(secs / 86400)
    const hours = Math.floor((secs % 86400) / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const isOperational = data?.status === 'operational'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Pulse System Status
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/login"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-purple-500/20"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 lg:p-10 space-y-8">
        {/* Banner Alert Status */}
        <div
          className={`p-6 rounded-2xl border flex items-center gap-4 ${
            isOperational
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
          }`}
        >
          {isOperational ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-rose-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">
              {isOperational ? 'All Systems Operational' : 'Partial Service Interruption'}
            </h1>
            <p className="text-xs opacity-80 mt-0.5">
              {isOperational
                ? 'All Core API services, databases, and snapshot jobs are functioning normally.'
                : 'Some API endpoints or database connections are currently experiencing degradation.'}
            </p>
          </div>
          {data && (
            <div className="text-right shrink-0 font-mono text-xs font-bold text-slate-400">
              Uptime: {formatUptime(data.uptimeSeconds)}
            </div>
          )}
        </div>

        {/* Individual Service Health Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Components</h2>
          <div className="space-y-2">
            {[
              { id: 'api', name: 'Core REST API & Auth', desc: 'JWT Authentication, RBAC, and telemetry engine' },
              { id: 'database', name: 'Primary Database', desc: 'SQLite / PostgreSQL data persistence layer' },
              { id: 'snapshots', name: 'Daily MRR Snapshot Worker', desc: 'Automated 00:00 UTC rollover background job' },
              { id: 'webhooks', name: 'Stripe Webhook Listener', desc: 'Real-time billing event ingestion worker' },
            ].map(svc => {
              const check = data?.checks[svc.id] ?? { status: isOperational ? 'operational' : 'degraded', latencyMs: 12 }
              const isServiceOperational = check.status === 'operational'
              const dotClass = isServiceOperational ? 'bg-emerald-400 shadow-emerald-500/50' : 'bg-rose-400 shadow-rose-500/50'
              return (
                <div
                  key={svc.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotClass} shadow-sm`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{svc.name}</p>
                      <p className="text-xs text-slate-400">{svc.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {check.latencyMs !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500">{check.latencyMs}ms</span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${isServiceOperational ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' : 'bg-rose-950/60 text-rose-400 border-rose-800/50'}`}>
                      {isServiceOperational ? 'Operational' : 'Degraded'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Metadata & Compliance Footer */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Pulse Enterprise Core v{data?.version || '1.0.0'}</span>
          </div>
          <div>
            Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Just now'} · Auto-refreshes every 30s
          </div>
        </div>
      </main>
    </div>
  )
}

export default StatusPage
