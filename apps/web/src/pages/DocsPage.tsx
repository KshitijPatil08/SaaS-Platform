import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Terminal, Key, Shield, ArrowLeft, Code, Database,
  Copy, Check, Layers, Server, Globe, Cpu, Zap, Lock, ChevronRight
} from 'lucide-react'

type CodeLang = 'curl' | 'javascript' | 'python'

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  auth: boolean
  planGated?: string
  params?: string
  responseJson: string
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/kpis',
    description: 'Returns real-time core SaaS metrics: total MRR, customer count, period-scoped 30-day churn rate, and health score distribution.',
    auth: true,
    planGated: 'Enforced (HTTP 402 if customer count exceeds plan cap)',
    responseJson: `{
  "mrrCents": 184500,
  "customerCount": 20,
  "churnRate": 4.8,
  "health": {
    "distribution": { "healthy": 14, "warning": 4, "at_risk": 2 }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/mrr?range=last_12_months',
    description: 'Retrieves historical monthly MRR snapshots including new, expansion, contraction, and churned MRR components.',
    auth: true,
    params: 'range=last_30_days | last_90_days | last_12_months',
    responseJson: `[
  {
    "date": "2026-06-01T00:00:00.000Z",
    "mrr": 165000,
    "newMrr": 20000,
    "expansionMrr": 5000,
    "churnedMrr": 2000,
    "customerCount": 18
  },
  {
    "date": "2026-07-01T00:00:00.000Z",
    "mrr": 184500,
    "newMrr": 24500,
    "expansionMrr": 3000,
    "churnedMrr": 8000,
    "customerCount": 20
  }
]`,
  },
  {
    method: 'GET',
    path: '/api/funnel',
    description: 'Returns conversion funnel analytics from visitor landing to active subscription.',
    auth: true,
    planGated: 'Enforced',
    responseJson: `[
  { "step": "Visitor", "count": 5200, "conversionRate": 100 },
  { "step": "Signup", "count": 840, "conversionRate": 16.15 },
  { "step": "Trial Started", "count": 310, "conversionRate": 36.9 },
  { "step": "Subscription Active", "count": 145, "conversionRate": 46.77 }
]`,
  },
  {
    method: 'GET',
    path: '/api/accounts?status=active&search=tech',
    description: 'Lists customer accounts with optional status filtering and name/email search.',
    auth: true,
    planGated: 'Enforced',
    params: 'status=active|past_due|canceled & search=query & page=1 & limit=20',
    responseJson: `{
  "customers": [
    {
      "id": "cust-001",
      "name": "TechFlow Solutions",
      "email": "contact@techflow.com",
      "plan": "pro",
      "status": "active",
      "mrrCents": 14900,
      "billingCycle": "monthly",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}`,
  },
  {
    method: 'GET',
    path: '/api/health',
    description: 'Retrieves customer health scores sorted by risk level to identify churn targets.',
    auth: true,
    planGated: 'Enforced',
    responseJson: `[
  {
    "customerId": "cust-001",
    "customerName": "TechFlow Solutions",
    "score": 92,
    "status": "healthy",
    "signals": { "eventsLast30Days": 42, "paymentFailures": 0 }
  },
  {
    "customerId": "cust-005",
    "customerName": "Nova Dynamics",
    "score": 38,
    "status": "at_risk",
    "signals": { "eventsLast30Days": 2, "paymentFailures": 1 }
  }
]`,
  },
  {
    method: 'POST',
    path: '/api/export?format=csv',
    description: 'Generates a downloadable CSV or JSON export of your metrics.',
    auth: true,
    planGated: 'Export gate (Requires Starter, Pro, or Enterprise plan)',
    responseJson: `"date","mrr_usd","new_mrr_usd","churned_mrr_usd","customers"
"2026-06-01",1650.00,200.00,20.00,18
"2026-07-01",1845.00,245.00,80.00,20"`,
  },
  {
    method: 'POST',
    path: '/webhooks/stripe',
    description: 'Ingests raw Stripe signature-verified webhooks for customer subscription updates.',
    auth: false,
    params: 'Header: stripe-signature',
    responseJson: `{ "received": true }`,
  },
]

const DocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'quickstart' | 'security' | 'hosting'>('endpoints')
  const [selectedLang, setSelectedLang] = useState<CodeLang>('curl')
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Fix #14: page title
  useEffect(() => { document.title = 'API Documentation | Pulse' }, [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPath(text)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  const renderCodeSnippet = (ep: EndpointDoc) => {
    const baseUrl = 'http://localhost:5000'
    if (selectedLang === 'curl') {
      return `curl -X ${ep.method} "${baseUrl}${ep.path}" \\
  -H "Authorization: Bearer <your_jwt_access_token>" \\
  -H "Content-Type: application/json"`
    }
    if (selectedLang === 'javascript') {
      return `import axios from 'axios'

const response = await axios.${ep.method.toLowerCase()}('${baseUrl}${ep.path}', {
  withCredentials: true, // or headers: { Authorization: 'Bearer <token>' }
})
console.log(response.data)`
    }
    return `import requests

url = "${baseUrl}${ep.path}"
headers = {"Authorization": "Bearer <your_token>"}
response = requests.${ep.method.toLowerCase()}(url, headers=headers)
print(response.json())`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 font-sans selection:bg-purple-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Pulse Platform
            </Link>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-purple-500" /> Pulse API Reference & Docs
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete REST API specification, Stripe integration guides, and self-hosted deployment documentation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> API v1.0 Active
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {[
            { id: 'endpoints', label: 'REST API Endpoints', icon: <Code className="h-4 w-4" /> },
            { id: 'quickstart', label: 'Stripe Webhook Setup', icon: <Terminal className="h-4 w-4" /> },
            { id: 'security', label: 'Security & Auth', icon: <Shield className="h-4 w-4" /> },
            { id: 'hosting', label: 'Self-Hosting & Docker', icon: <Server className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: REST API Endpoints */}
        {activeTab === 'endpoints' && (
          <div className="space-y-6">
            {/* Language Switcher */}
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Select Code Snippet Language:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['curl', 'javascript', 'python'] as CodeLang[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-colors ${
                      selectedLang === lang ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoints List */}
            <div className="space-y-6">
              {ENDPOINTS.map((ep) => (
                <div key={ep.path} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs font-mono font-extrabold rounded-lg ${
                        ep.method === 'GET' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-purple-950 text-purple-400 border border-purple-800'
                      }`}>
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono font-bold text-white select-all">{ep.path}</code>
                    </div>

                    <div className="flex items-center gap-2">
                      {ep.auth && (
                        <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Lock className="h-3 w-3 text-purple-400" /> Protected JWT
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(ep.path)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        title="Copy Endpoint Path"
                      >
                        {copiedPath === ep.path ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{ep.description}</p>

                  {ep.params && (
                    <div className="text-xs text-slate-400">
                      <strong className="text-slate-200">Query Parameters:</strong> <code className="text-purple-300 font-mono">{ep.params}</code>
                    </div>
                  )}

                  {ep.planGated && (
                    <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {ep.planGated}
                    </div>
                  )}

                  {/* Code & Response snippet */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Request ({selectedLang})</div>
                      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto">
                        {renderCodeSnippet(ep)}
                      </pre>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Response JSON (200 OK)</div>
                      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                        {ep.responseJson}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Quickstart & Webhooks */}
        {activeTab === 'quickstart' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-indigo-400" /> Stripe Webhook Setup Guide
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pulse ingests Stripe webhooks to automatically maintain customer accounts, subscriptions, and MRR calculations without manual data entry.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Step 1: Get Endpoint URL</span>
                <p className="text-xs text-slate-300">Copy your endpoint URL from your Pulse Settings page:</p>
                <code className="block p-2.5 bg-slate-900 rounded-lg text-xs font-mono text-emerald-400 select-all">
                  http://your-pulse-domain.com/webhooks/stripe
                </code>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Step 2: Add Webhook in Stripe Dashboard</span>
                <p className="text-xs text-slate-300">In Stripe Dashboard &gt; Developers &gt; Webhooks, select the following events to listen to:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-purple-400" /> customer.subscription.created</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-purple-400" /> customer.subscription.updated</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-purple-400" /> customer.subscription.deleted</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-purple-400" /> invoice.paid</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Step 3: Save STRIPE_WEBHOOK_SECRET</span>
                <p className="text-xs text-slate-300">Copy the Signing Secret (<code className="text-purple-300">whsec_...</code>) from Stripe and set it in your <code className="text-slate-200">apps/api/.env</code> file.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Security & Auth */}
        {activeTab === 'security' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" /> Authentication & Security Architecture
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-purple-400 text-sm">JWT Cookie & Bearer Tokens</h3>
                <p className="text-slate-300 leading-relaxed">
                  Pulse uses short-lived HTTP-only access cookies signed with <code className="text-slate-200">JWT_SECRET</code> alongside a 7-day refresh cookie.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-purple-400 text-sm">TOTP Multi-Factor Authentication</h3>
                <p className="text-slate-300 leading-relaxed">
                  2FA is supported via standard TOTP authenticator apps (Google Authenticator, 1Password). Enrolled admins are prompted for 6-digit codes on login.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-purple-400 text-sm">Rate Limiting & Lockout</h3>
                <p className="text-slate-300 leading-relaxed">
                  Brute-force protection limits auth attempts to 10 req/min. Locked IPs can be monitored and reset from Settings.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-bold text-purple-400 text-sm">Audit Trail Logging</h3>
                <p className="text-slate-300 leading-relaxed">
                  Every login, export, password change, and MFA enrollment is logged with timestamp, user email, and client IP address.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Self-Hosting & Docker */}
        {activeTab === 'hosting' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-400" /> Self-Hosted Docker Deployment
            </h2>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">Run Pulse on your own VPS or Kubernetes cluster with Docker Compose:</p>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-purple-300 overflow-x-auto">
{`# 1. Clone repository
git clone https://github.com/KshitijPatil08/SaaS-Platform.git
cd SaaS-Platform

# 2. Configure environment variables
cp apps/api/.env.example apps/api/.env

# 3. Start containers
docker compose up -d`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocsPage
