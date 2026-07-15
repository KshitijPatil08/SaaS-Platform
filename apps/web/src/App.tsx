import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import SideNav from './components/SideNav'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex min-h-screen">
          <SideNav />
          <main className="flex-1 ml-64 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 min-h-screen">
            <Routes>
              <Route path="" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
