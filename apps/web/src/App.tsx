import React, { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import SideNav from './components/SideNav'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import AccountsPage from './pages/AccountsPage'
import FunnelPage from './pages/FunnelPage'
import HealthPage from './pages/HealthPage'
import BillingPage from './pages/BillingPage'
import LandingPage from './pages/LandingPage'
import DocsPage from './pages/DocsPage'

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
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <main className="flex-1 ml-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/funnel" element={<FunnelPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/billing" element={<BillingPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthRedirect />
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
