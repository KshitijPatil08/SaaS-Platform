import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Sliders, Check, Save } from 'lucide-react'

export const HealthRuleBuilder: React.FC = () => {
  const [paymentWeight, setPaymentWeight] = useState(40)
  const [ageWeight, setAgeWeight] = useState(20)
  const [activityWeight, setActivityWeight] = useState(20)
  const [mrrTrendWeight, setMrrTrendWeight] = useState(20)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/health-rules/rules')
      setPaymentWeight(res.data.paymentWeightPct ?? 40)
      setAgeWeight(res.data.accountAgeWeightPct ?? 20)
      setActivityWeight(res.data.eventActivityWeightPct ?? 20)
      setMrrTrendWeight(res.data.mrrTrendWeightPct ?? 20)
    } catch {}
  }

  const totalSum = paymentWeight + ageWeight + activityWeight + mrrTrendWeight

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalSum !== 100) return
    setSaving(true)
    setMsg(null)
    try {
      await api.put('/api/health-rules/rules', {
        paymentWeightPct: paymentWeight,
        accountAgeWeightPct: ageWeight,
        eventActivityWeightPct: activityWeight,
        mrrTrendWeightPct: mrrTrendWeight,
      })
      setMsg('Custom health scoring weights saved successfully!')
    } catch {
      setMsg('Failed to save health weights.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Customizable Health Score Rule Builder</h2>
            <p className="text-xs text-slate-400">Configure custom signal weights to tailor account health scoring to your SaaS business model</p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${totalSum === 100 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'}`}>
          Total: {totalSum}% {totalSum === 100 ? '✓ Valid' : '(Must sum to 100%)'}
        </div>
      </div>

      {msg && (
        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
          {msg}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>Payment Status Weight</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{paymentWeight}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={paymentWeight} onChange={e => setPaymentWeight(Number(e.target.value))} className="w-full accent-purple-600" />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>Account Age Weight</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{ageWeight}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={ageWeight} onChange={e => setAgeWeight(Number(e.target.value))} className="w-full accent-purple-600" />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>Event Activity Velocity</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{activityWeight}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={activityWeight} onChange={e => setActivityWeight(Number(e.target.value))} className="w-full accent-purple-600" />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>MRR Growth Trend</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{mrrTrendWeight}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={mrrTrendWeight} onChange={e => setMrrTrendWeight(Number(e.target.value))} className="w-full accent-purple-600" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || totalSum !== 100}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md shadow-purple-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving Weights…' : 'Save Health Rule Weights'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default HealthRuleBuilder
