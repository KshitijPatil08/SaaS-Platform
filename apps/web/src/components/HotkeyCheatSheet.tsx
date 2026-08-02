import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X, Command, ArrowRight } from 'lucide-react'

interface HotkeyCheatSheetProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open Command & Search Palette', path: undefined },
  { keys: ['?'], label: 'Open Keyboard Shortcuts Cheat Sheet', path: undefined },
  { keys: ['G', 'D'], label: 'Navigate to Dashboard', path: '/' },
  { keys: ['G', 'A'], label: 'Navigate to Accounts List', path: '/accounts' },
  { keys: ['G', 'F'], label: 'Navigate to Conversion Funnel', path: '/funnel' },
  { keys: ['G', 'H'], label: 'Navigate to Account Health', path: '/health' },
  { keys: ['G', 'S'], label: 'Navigate to Organization Settings', path: '/settings' },
  { keys: ['Esc'], label: 'Close Active Modal or Slide-over Panel', path: undefined },
]

export const HotkeyCheatSheet: React.FC<HotkeyCheatSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-400">Power user hotkeys for instant platform navigation</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Shortcut Items List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {SHORTCUTS.map((s, i) => (
              <div
                key={i}
                onClick={() => handleNavigate(s.path)}
                className={`flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs transition-colors ${s.path ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">{s.label}</span>
                <div className="flex items-center gap-1.5">
                  {s.keys.map((k, idx) => (
                    <kbd
                      key={idx}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">?</kbd> anywhere to open this dialog</span>
            <span>Esc to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default HotkeyCheatSheet
