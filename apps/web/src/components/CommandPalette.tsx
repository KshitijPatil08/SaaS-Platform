import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Users, Filter, Activity,
  CreditCard, Settings, Download, Sun, Moon, ArrowRight, X, Command
} from 'lucide-react'
import { useAccounts } from '../hooks/useKpis'
import { useTheme } from '../hooks/useTheme'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}

const COMMAND_NAV = [
  { id: 'dash', label: 'Go to Dashboard', path: '/', icon: <LayoutDashboard className="h-4 w-4 text-purple-500" /> },
  { id: 'acc', label: 'Go to Accounts', path: '/accounts', icon: <Users className="h-4 w-4 text-blue-500" /> },
  { id: 'funnel', label: 'Go to Conversion Funnel', path: '/funnel', icon: <Filter className="h-4 w-4 text-amber-500" /> },
  { id: 'health', label: 'Go to Account Health', path: '/health', icon: <Activity className="h-4 w-4 text-emerald-500" /> },
  { id: 'billing', label: 'Go to Billing & Subscription', path: '/billing', icon: <CreditCard className="h-4 w-4 text-indigo-500" /> },
  { id: 'settings', label: 'Go to Organization Settings', path: '/settings', icon: <Settings className="h-4 w-4 text-rose-500" /> },
]

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpen }) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { data: accountsData } = useAccounts(1, 5, undefined, undefined, query || undefined)
  const matchingAccounts = accountsData?.data ?? []

  // Global keydown handler for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          setQuery('')
          onOpen()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSelectNav = (path: string) => {
    navigate(path)
    onClose()
  }

  const filteredNav = COMMAND_NAV.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 space-y-0"
        >
          {/* Input Bar */}
          <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, customers, or actions… (Press Esc to exit)"
              autoFocus
              className="w-full py-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {/* Quick Actions */}
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Navigation & Actions
              </p>
              <div className="space-y-0.5">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
                  </button>
                ))}

                <button
                  onClick={() => { toggleTheme(); onClose() }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-400" />}
                    <span>Toggle {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">Action</span>
                </button>
              </div>
            </div>

            {/* Customer Search Results */}
            {query && matchingAccounts.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Matching Customer Accounts
                </p>
                <div className="space-y-0.5">
                  {matchingAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectNav(`/accounts?search=${encodeURIComponent(acc.name)}`)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                          {acc.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{acc.name}</p>
                          <p className="text-[10px] text-slate-400">{acc.email}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                        {acc.mrr_cents ? `$${(acc.mrr_cents / 100).toFixed(0)}/mo` : 'Free'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" /> + K to toggle anywhere
            </span>
            <span>Esc to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
