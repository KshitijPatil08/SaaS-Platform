import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { StickyNote, Send, Trash2, User } from 'lucide-react'

interface Note {
  id: string
  author: string
  body: string
  created_at: string
}

interface CustomerNotesProps {
  customerId: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const CustomerNotes: React.FC<CustomerNotesProps> = ({ customerId }) => {
  const [notes, setNotes] = useState<Note[]>([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/api/customer-notes/${customerId}`)
      setNotes(res.data)
    } catch {}
  }

  useEffect(() => {
    if (customerId) fetchNotes()
  }, [customerId])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    try {
      await api.post(`/api/customer-notes/${customerId}`, { body })
      setBody('')
      await fetchNotes()
    } catch {}
    setPosting(false)
  }

  const handleDelete = async (noteId: string) => {
    try {
      await api.delete(`/api/customer-notes/${customerId}/${noteId}`)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
        <StickyNote className="h-4 w-4 text-purple-500" />
        Internal CRM Notes
        {notes.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-[10px] font-bold">
            {notes.length}
          </span>
        )}
      </div>

      {/* Note Input */}
      <form onSubmit={handlePost} className="flex gap-2">
        <textarea
          rows={2}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a note… (e.g. Called John, offered 20% off renewal)"
          className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors self-end"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Notes Feed */}
      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
        {notes.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400">No notes yet. Add the first one above.</p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="group flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60"
            >
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{note.author}</span>
                  <span className="text-[10px] text-slate-400">{timeAgo(note.created_at)}</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{note.body}</p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CustomerNotes
