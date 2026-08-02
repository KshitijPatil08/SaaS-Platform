import React, { useState } from 'react'
import { api } from '../lib/api'
import { Zap, Play, Check, AlertTriangle, XCircle, Code } from 'lucide-react'

export const WebhookPlayground: React.FC = () => {
  const [eventType, setEventType] = useState<'subscription_created' | 'payment_failed' | 'subscription_deleted'>('subscription_created')
  const [customerEmail, setCustomerEmail] = useState('demo.customer@acme.io')
  const [mrrUsd, setMrrUsd] = useState(199)
  const [simulating, setSimulating] = useState(false)
  const [responseLog, setResponseLog] = useState<any | null>(null)

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSimulating(true)
    setResponseLog(null)

    try {
      const res = await api.post('/api/webhooks-simulator/simulate', {
        eventType,
        customerEmail,
        mrrUsd,
      })
      setResponseLog(res.data)
    } catch (err: any) {
      setResponseLog({ error: err?.response?.data?.error || 'Simulation failed' })
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Webhook Event Playground & Developer Simulator</h2>
          <p className="text-xs text-slate-400">Simulate live Stripe webhooks to test MRR updates, event processing, and Slack alerts</p>
        </div>
      </div>

      <form onSubmit={handleRunSimulation} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Stripe Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              <option value="subscription_created">🟢 customer.subscription.created (+MRR)</option>
              <option value="payment_failed">⚠️ invoice.payment_failed (Past Due)</option>
              <option value="subscription_deleted">🚨 customer.subscription.deleted (Churn)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Customer Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">MRR Amount ($/mo)</label>
            <input
              type="number"
              value={mrrUsd}
              onChange={(e) => setMrrUsd(Number(e.target.value))}
              required
              min={1}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={simulating}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {simulating ? 'Simulating Event…' : 'Trigger Simulated Webhook'}
          </button>
        </div>
      </form>

      {/* JSON Response Inspector */}
      {responseLog && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-purple-400">
              <Code className="h-3.5 w-3.5" /> Simulation Result Output
            </span>
            <span>{responseLog.timestamp || 'Just now'}</span>
          </div>
          {responseLog.summary && (
            <p className="text-emerald-400 font-sans text-xs font-bold">{responseLog.summary}</p>
          )}
          <pre className="overflow-x-auto text-[11px] text-slate-300">
            {JSON.stringify(responseLog, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default WebhookPlayground
