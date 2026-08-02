import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Target, Edit3, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface GoalData {
  goal: { label: string; target_mrr_cents: number; target_date: string } | null
  currentMrrCents: number
  progressPct: number | null
}

// Inline radial progress — pure SVG, no external deps
function RadialProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-100 dark:text-slate-800" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#goalGrad)" strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: filled }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export const MrrGoalWidget: React.FC = () => {
  const [data, setData] = useState<GoalData | null>(null)
  const [editing, setEditing] = useState(false)
  const [targetMrr, setTargetMrr] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchGoal = async () => {
    try {
      const res = await api.get('/api/mrr-goal')
      setData(res.data)
      if (res.data.goal) {
        setTargetMrr(String(Math.round(res.data.goal.target_mrr_cents / 100)))
        setTargetDate(res.data.goal.target_date.slice(0, 10))
        setLabel(res.data.goal.label)
      }
    } catch {}
  }

  useEffect(() => { fetchGoal() }, [])

  const handleSave = async () => {
    if (!targetMrr || !targetDate) return
    setSaving(true)
    try {
      await api.put('/api/mrr-goal', {
        label: label || 'MRR Target',
        target_mrr_cents: Math.round(Number(targetMrr) * 100),
        target_date: targetDate,
      })
      await fetchGoal()
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  const pct = data?.progressPct ?? 0
  const currentUsd = Math.round((data?.currentMrrCents ?? 0) / 100)
  const targetUsd = data?.goal ? Math.round(data.goal.target_mrr_cents / 100) : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Target className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {data?.goal?.label || 'Revenue Goal'}
          </span>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            type="text" placeholder="Goal label (e.g. Q4 Target)"
            value={label} onChange={e => setLabel(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Target MRR ($)</label>
              <input
                type="number" placeholder="50000"
                value={targetMrr} onChange={e => setTargetMrr(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Target Date</label>
              <input
                type="date"
                value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <button
            onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Set Revenue Goal'}
          </button>
        </div>
      ) : !data?.goal ? (
        <div className="flex flex-col items-center py-4 gap-2">
          <Target className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-400 text-center">No revenue goal set yet.</p>
          <button onClick={() => setEditing(true)} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
            + Set your first MRR goal
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <RadialProgress pct={pct} size={80} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{pct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Current MRR</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              ${currentUsd.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              of <span className="font-bold text-slate-600 dark:text-slate-300">${targetUsd?.toLocaleString()}</span> target
              {data.goal?.target_date && (
                <> · by <span className="font-semibold">{new Date(data.goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></>
              )}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MrrGoalWidget
