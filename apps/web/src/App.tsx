import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SideNav from './components/SideNav'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      <SideNav />
      <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 min-h-screen">
        <Routes>
          <Route path="" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App