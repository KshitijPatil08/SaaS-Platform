import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ShieldCheck, Zap, ArrowRight, CheckCircle2, Server, Lock } from 'lucide-react'

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-purple-500" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Pulse SaaS
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/docs" className="text-slate-400 hover:text-slate-200 transition-colors">
            Docs
          </Link>
          <Link to="/login" className="text-slate-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-xs font-semibold">
          <Zap className="h-3.5 w-3.5 text-purple-400" /> Real-time Revenue & Customer Health Analytics
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Own your SaaS metrics <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            with total data privacy
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pulse provides real-time MRR tracking, retention cohorts, health scoring, and conversion funnels. Available self-hosted or cloud-managed.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/docs"
            className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
          >
            Explore Documentation
          </Link>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <BarChart3 className="h-8 w-8 text-purple-400" />
          <h3 className="text-lg font-bold text-white">MRR & Churn Tracking</h3>
          <p className="text-sm text-slate-400">
            Accurate, real-time MRR snapshots and rolling 30-day customer churn metrics synchronized with Stripe.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <ShieldCheck className="h-8 w-8 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Account Health Scoring</h3>
          <p className="text-sm text-slate-400">
            Algorithmic health scoring that highlights at-risk accounts before they churn.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <Server className="h-8 w-8 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Self-Hosted Differentiator</h3>
          <p className="text-sm text-slate-400">
            Keep your sensitive revenue data on your own infrastructure with 1-click Docker deployment.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} Pulse Analytics Inc. All rights reserved.
      </footer>
    </div>
  )
}

export default LandingPage
