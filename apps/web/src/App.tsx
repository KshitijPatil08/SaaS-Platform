import React, { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import SideNav from './components/SideNav'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import MfaVerify from './pages/MfaVerify'
import Settings from './pages/Settings'
import AccountsPage from './pages/AccountsPage'
import FunnelPage from './pages/FunnelPage'
import HealthPage from './pages/HealthPage'
import BillingPage from './pages/BillingPage'
import LandingPage from './pages/LandingPage'
import DocsPage from './pages/DocsPage'
import StatusPage from './pages/StatusPage'
import { ThemeProvider } from './hooks/useTheme'
import HotkeyCheatSheet from './components/HotkeyCheatSheet'
import ErrorBoundary from './components/ErrorBoundary'

import { Menu, BarChart3 } from 'lucide-react'

function AuthRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = () => navigate('/login')
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [navigate])
  return null
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let pendingGKey = false
    let timeout: any = null

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHotkeyModalOpen(o => !o)
        return
      }

      if (e.key.toLowerCase() === 'g') {
        pendingGKey = true
        clearTimeout(timeout)
        timeout = setTimeout(() => { pendingGKey = false }, 1000)
        return
      }

      if (pendingGKey) {
        pendingGKey = false
        const k = e.key.toLowerCase()
        if (k === 'd') navigate('/')
        else if (k === 'a') navigate('/accounts')
        else if (k === 'f') navigate('/funnel')
        else if (k === 'h') navigate('/health')
        else if (k === 's') navigate('/settings')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className="flex min-h-screen relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* SideNav with open state & toggle callback */}
      <SideNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Pulse
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/funnel" element={<FunnelPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      {/* Global Hotkey Cheat Sheet Modal */}
      <HotkeyCheatSheet isOpen={hotkeyModalOpen} onClose={() => setHotkeyModalOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <AuthRedirect />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/mfa" element={<MfaVerify />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/*" element={<AppLayout />} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
