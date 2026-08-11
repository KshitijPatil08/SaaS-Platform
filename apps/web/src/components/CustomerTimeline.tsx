import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap, Clock, ChevronDown, ChevronRight } from 'lucide-react'

export interface TimelineEvent {
  id: string
  name: string
  created_at: string
  occurred_at?: string
  payload?: Record<string, any> | null
}

interface CustomerTimelineProps {
  events: TimelineEvent[]
  customerName: string
}

function getEventMeta(name: string) {
  const n = name.toLowerCase()
  if (n.includes('subscription_created') || n.includes('upgrade') || n.includes('expansion')) {
    return {
      icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500',
      label: 'MRR Expansion / Plan Upgrade',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    }
  }
  if (n.includes('churn') || n.includes('cancel') || n.includes('downgrade')) {
    return {
      icon: <TrendingDown className="h-3.5 w-3.5 text-rose-500" />,
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-500',
      label: 'MRR Contraction / Cancellation',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    }
  }
  if (n.includes('past_due') || n.includes('failed') || n.includes('risk')) {
    return {
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500',
      label: 'Payment Past Due / Health Risk',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    }
  }
  if (n.includes('recovered') || n.includes('active')) {
    return {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />,
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-500',
      label: 'Revenue Recovered / Activated',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    }
  }
  return {
    icon: <Zap className="h-3.5 w-3.5 text-purple-500" />,
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-500',
    label: 'Usage & Account Activity',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
}

/** Render a single event card with optional collapsible payload */
const EventCard: React.FC<{ evt: TimelineEvent; idx: number }> = ({ evt, idx }) => {
  const [open, setOpen] = useState(false)
  const meta = getEventMeta(evt.name)
  const dateStr = new Date(evt.occurred_at || evt.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Filter payload to primitive values for display (skip null/objects/arrays)
  const payloadEntries = evt.payload
    ? Object.entries(evt.payload).filter(([, v]) => v !== null && typeof v !== 'object')
    : []

  return (
    <motion.div
      key={evt.id || idx}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="relative pl-6"
    >
      {/* Timeline Node Bullet */}
      <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full ${meta.bg} border-2 flex items-center justify-center shadow-sm`}>
        {meta.icon}
      </div>

      {/* Card Container */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.badge}`}>
            {meta.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400">{dateStr}</span>
        </div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
          {evt.name.replace(/_/g, ' ')}
        </p>

        {/* Collapsible payload details */}
        {payloadEntries.length > 0 && (
          <div>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1 text-[10px] text-purple-500 hover:text-purple-700 font-semibold mt-1 transition-colors"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {open ? 'Hide' : 'Show'} details ({payloadEntries.length} fields)
            </button>
            {open && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 bg-white dark:bg-slate-800/60 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
                {payloadEntries.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span className="text-[10px] font-bold text-slate-400 capitalize truncate">{k.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate">{String(v)}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({ events, customerName }) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center space-y-2 text-slate-400">
        <Clock className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600" />
        <p className="text-xs font-semibold">No journey timeline recorded yet for {customerName}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">360° Journey Timeline</p>
        <span className="text-[10px] font-semibold text-purple-500">{events.length} recorded events</span>
      </div>

      <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-4 pt-1">
        {events.map((evt, idx) => (
          <EventCard key={evt.id || idx} evt={evt} idx={idx} />
        ))}
      </div>
    </div>
  )
}

export default CustomerTimeline
