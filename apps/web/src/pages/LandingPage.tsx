import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3, ShieldCheck, Zap, ArrowRight, CheckCircle2, Server, Lock,
  Sparkles, Check, X, Play, Code, Database, Eye, Terminal, ChevronRight
} from 'lucide-react'
import { api } from '../lib/api'

const COMPARISON = [
  { feature: 'Data Storage & Residency', pulse: 'Your Infra / Self-Hosted', baremetrics: 'Third-Party Cloud (US)', chartmogul: 'Third-Party Cloud (US)' },
  { feature: 'SOC2 & Data Ownership', pulse: '100% Client Owned', baremetrics: 'Vendor Shared', chartmogul: 'Vendor Shared' },
  { feature: 'Stripe Webhook Sync', pulse: 'Real-Time (Idempotent)', baremetrics: 'Polling / Webhook', chartmogul: 'Polling / Webhook' },
  { feature: 'Algorithmic Health Scoring', pulse: 'Included (0-100)', baremetrics: 'Add-on ($$$)', chartmogul: 'Add-on ($$$)' },
  { feature: 'Custom Data Pipeline / API', pulse: 'Full REST API + Exports', baremetrics: 'Restricted API', chartmogul: 'Restricted API' },
  { feature: 'Starting Price', pulse: '$0 / $49 mo', baremetrics: '$129+ / mo', chartmogul: '$100+ / mo' },
]

const PRICING_CARDS = [
  {
    name: 'Free',
    price: '$0',
    desc: 'For early bootstrapped startups',
    features: ['Up to 50 active customers', 'MRR & Churn tracking', '30-day data retention', 'Standard dashboards'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    desc: 'Essential analytics for growing apps',
    features: ['Up to 500 active customers', 'MRR & Churn tracking', '90-day retention', 'CSV data exports', '3 Admin seats'],
    cta: 'Start 14-Day Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/month',
    desc: 'Full intelligence suite for scaling SaaS',
    features: ['Up to 5,000 active customers', 'Real-time health scores', '365-day data retention', 'CSV & PDF exports', '10 Admin seats', '2FA & Audit logs'],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    desc: 'Self-hosted dedicated deployment',
    features: ['Unlimited customers', 'Unlimited retention', 'Docker / Helm charts', 'Custom SSO & SAML', '24/7 SLA & Dedicated Support'],
    cta: 'Contact Sales / Self-Host',
    highlight: false,
  },
]

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [demoLoading, setDemoLoading] = useState(false)

  // Fix #14: page title
  useEffect(() => { document.title = 'Pulse — Self-Hosted SaaS Revenue Intelligence' }, [])

  const handleLaunchDemo = async () => {
    setDemoLoading(true)
    try {
      await api.post('/api/auth/demo')
      navigate('/')
    } catch {
      navigate('/login')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 py-2 px-4 text-center text-xs font-medium text-purple-200 border-b border-purple-800/40">
        🚀 <span className="font-bold text-white">Self-Hosted SaaS Revenue Intelligence:</span> Keep 100% of your financial metrics inside your own cloud infrastructure.
      </div>

      {/* Navigation Bar */}
      <nav className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Pulse SaaS
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <a href="#comparison" className="hidden sm:inline text-slate-400 hover:text-slate-200 transition-colors">
            Why Pulse
          </a>
          <a href="#pricing" className="hidden sm:inline text-slate-400 hover:text-slate-200 transition-colors">
            Pricing
          </a>
          <Link to="/docs" className="text-slate-400 hover:text-slate-200 transition-colors">
            API Docs
          </Link>
          <Link to="/login" className="text-slate-300 hover:text-white transition-colors font-medium">
            Log in
          </Link>
          <button
            onClick={handleLaunchDemo}
            disabled={demoLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"
          >
            {demoLoading ? 'Launching Demo…' : 'Live Interactive Demo'} <Play className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-purple-400" /> Complete Revenue & Health Intelligence for SaaS
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white">
          SaaS Metrics Without Sending Data <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            To Third-Party Analytics Vendors
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pulse calculates real-time MRR, Net Churn, Conversion Funnels, and Customer Health Scores directly from your Stripe webhooks — deployed inside your container environment or private cloud.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={handleLaunchDemo}
            disabled={demoLoading}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all text-sm"
          >
            <Play className="h-4 w-4 fill-current" /> Explore Interactive Demo (Instant Access)
          </button>
          <Link
            to="/register"
            className="px-6 py-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            Self-Host / Sign Up Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 pt-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Docker & Kubernetes Ready</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-purple-400" /> Built-in 2FA & Audit Logs</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> SOC2 Compliant Schema</span>
        </div>
      </header>

      {/* Differentiator Section */}
      <section id="comparison" className="max-w-6xl mx-auto px-6 py-16 space-y-10 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">The Self-Hosted Advantage</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Why SaaS Founders Are Switching to Pulse</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Stop giving third-party cloud vendors raw access to your entire customer billing database.
          </p>
        </div>

        <div className="overflow-x-auto bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5 font-bold">Feature / Capability</th>
                <th className="py-4 px-5 font-bold text-purple-300 bg-purple-950/30">Pulse SaaS</th>
                <th className="py-4 px-5 font-bold text-slate-500">Baremetrics</th>
                <th className="py-4 px-5 font-bold text-slate-500">ChartMogul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {COMPARISON.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-200">{row.feature}</td>
                  <td className="py-3.5 px-5 font-bold text-purple-300 bg-purple-950/20">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {row.pulse}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-slate-400">{row.baremetrics}</td>
                  <td className="py-3.5 px-5 text-slate-400">{row.chartmogul}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">MRR & Net Churn Analytics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Track New MRR, Expansion MRR, Contraction MRR, and Period-Scoped Churn Rate calculated against starting customer base.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Customer Health Scoring</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Algorithmic health scoring (Healthy / Warning / At Risk) based on event frequency, plan tier, and payment stability.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
            <Server className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">B2B Security & Audit Trails</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Equipped with TOTP Multi-Factor Authentication, Rate Limiting machinery, Lockout resets, and full Security Audit Logging.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 space-y-8 border-t border-slate-900">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Transparent Billing</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Simple, Predictable Subscription Tiers</h2>
          <p className="text-xs text-slate-400">Scale your revenue tracking without surprise per-customer seat taxes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRICING_CARDS.map((card, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 ${
                card.highlight
                  ? 'bg-gradient-to-b from-purple-950/80 to-slate-900 border-purple-500/80 ring-1 ring-purple-500/40 shadow-xl'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{card.name}</h3>
                  {card.highlight && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500 text-white uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{card.desc}</p>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl font-extrabold text-white">{card.price}</span>
                  {card.period && <span className="text-xs text-slate-400">{card.period}</span>}
                </div>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  {card.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  card.highlight
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 px-6 text-slate-500 text-xs mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-slate-300">Pulse SaaS Analytics Platform</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <Link to="/docs" className="hover:text-white">API Docs</Link>
            <Link to="/login" className="hover:text-white">Login</Link>
            <Link to="/register" className="hover:text-white">Register</Link>
          </div>
          <div>&copy; {new Date().getFullYear()} Pulse Analytics Inc.</div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
