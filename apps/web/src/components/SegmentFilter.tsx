import React, { useState, useEffect } from 'react'
import { Sparkles, ShieldAlert, CreditCard, Clock, Layers, Star, Plus, Bookmark, X } from 'lucide-react'
import { api } from '../lib/api'

export type SegmentType = 'all' | 'enterprise' | 'at_risk' | 'past_due' | 'trialing' | (string & {})

interface SavedSegmentItem {
  id: string
  name: string
  filters: string
}

interface SegmentFilterProps {
  activeSegment: SegmentType
  onSelectSegment: (segment: SegmentType) => void
}

const DEFAULT_SEGMENTS: Array<{ id: SegmentType; label: string; icon: React.ReactNode; color: string }> = [
  { id: 'all', label: 'All Accounts', icon: <Layers className="h-3.5 w-3.5" />, color: 'text-purple-500' },
  { id: 'enterprise', label: 'Enterprise ($500+ MRR)', icon: <Star className="h-3.5 w-3.5" />, color: 'text-amber-500' },
  { id: 'at_risk', label: 'High Risk (Health <40)', icon: <ShieldAlert className="h-3.5 w-3.5" />, color: 'text-rose-500' },
  { id: 'past_due', label: 'Dunning (Past Due)', icon: <CreditCard className="h-3.5 w-3.5" />, color: 'text-indigo-500' },
  { id: 'trialing', label: 'Active Trials', icon: <Clock className="h-3.5 w-3.5" />, color: 'text-blue-500' },
]

export const SegmentFilter: React.FC<SegmentFilterProps> = ({ activeSegment, onSelectSegment }) => {
  const [customSegments, setCustomSegments] = useState<SavedSegmentItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [saving, setSaving] = useState(false)
  const [segmentsLoading, setSegmentsLoading] = useState(false)
  const [segmentsError, setSegmentsError] = useState<string | null>(null)

  const fetchSavedSegments = async () => {
    setSegmentsLoading(true)
    setSegmentsError(null)
    try {
      const res = await api.get('/api/saved-segments')
      setCustomSegments(Array.isArray(res.data) ? res.data : [])
    } catch {
      setSegmentsError('Could not load saved segments')
    } finally {
      setSegmentsLoading(false)
    }
  }

  useEffect(() => {
    fetchSavedSegments()
  }, [])

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSegmentName.trim()) return
    setSaving(true)
    try {
      await api.post('/api/saved-segments', {
        name: newSegmentName.trim(),
        filters: { segment: activeSegment },
      })
      setNewSegmentName('')
      setShowAddModal(false)
      await fetchSavedSegments()
    } catch (err: any) {
      // Show error inside modal
      const errMsg = err?.response?.data?.error || 'Failed to save segment'
      setSegmentsError(errMsg)
    }
    setSaving(false)
  }

  const handleDeleteSegment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/saved-segments/${id}`)
      setCustomSegments(prev => prev.filter(s => s.id !== id))
    } catch {
      setSegmentsError('Failed to delete segment')
    }
  }


  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-purple-500" /> Segments:
        {segmentsLoading && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />}
      </span>
      {segmentsError && (
        <span className="text-[10px] text-amber-500 font-medium shrink-0" title={segmentsError}>⚠ segments</span>
      )}

      {/* Built-in segments */}
      {DEFAULT_SEGMENTS.map((seg) => {
        const isActive = activeSegment === seg.id
        return (
          <button
            key={seg.id}
            onClick={() => onSelectSegment(seg.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              isActive
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <span className={isActive ? 'text-white' : seg.color}>{seg.icon}</span>
            <span>{seg.label}</span>
          </button>
        )
      })}

      {/* Custom saved segments */}
      {customSegments.map((cs) => {
        const isActive = activeSegment === cs.id
        return (
          <div
            key={cs.id}
            onClick={() => onSelectSegment(cs.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer group ${
              isActive
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
            <span>{cs.name}</span>
            <button
              onClick={(e) => handleDeleteSegment(cs.id, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}

      {/* Save current view button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors shrink-0"
        title="Save current segment preset"
      >
        <Plus className="h-3.5 w-3.5" /> Save View
      </button>

      {/* Modal for saving custom segment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-purple-500" /> Save Segment View
              </span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSegment} className="space-y-3">
              <input
                type="text"
                placeholder="Segment name (e.g. VIP Enterprise Trialing)"
                value={newSegmentName}
                onChange={e => setNewSegmentName(e.target.value)}
                autoFocus
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700">
                  {saving ? 'Saving…' : 'Save Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SegmentFilter
