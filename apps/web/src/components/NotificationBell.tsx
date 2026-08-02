import React, { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, Zap, TrendingDown, AlertTriangle, UserPlus, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'

interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  meta: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  churn:         { icon: <TrendingDown className="h-4 w-4" />, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  payment_failed:{ icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  health_drop:   { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40' },
  new_customer:  { icon: <UserPlus className="h-4 w-4" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  goal_reached:  { icon: <Target className="h-4 w-4" />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  default:       { icon: <Zap className="h-4 w-4" />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/in-app-notifications?limit=20')
      setNotifications(res.data.notifications)
      setUnreadCount(res.data.unreadCount)
    } catch { /* silently fail if not logged in */ }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    setOpen(o => !o)
    if (!open && unreadCount > 0) {
      try {
        await api.post('/api/in-app-notifications/mark-read')
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch {}
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</span>
              <button onClick={() => setOpen(false)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Feed */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.read ? 'bg-purple-50/40 dark:bg-purple-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <span className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${cfg.color}`}>
                        {cfg.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 bg-purple-500 rounded-full shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                <button
                  onClick={async () => {
                    await api.post('/api/in-app-notifications/mark-read')
                    setUnreadCount(0)
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
