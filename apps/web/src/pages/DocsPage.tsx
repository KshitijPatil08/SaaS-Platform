import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Terminal, Key, Shield, ArrowLeft } from 'lucide-react'

const DocsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-purple-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-500" /> Pulse Documentation & Integration Guide
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Complete guide for setting up Pulse, integrating Stripe webhooks, and self-hosting.
          </p>
        </div>

        {/* Quickstart */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" /> Quickstart: Stripe Webhook Setup
          </h2>
          <p className="text-sm text-slate-300">
            To synchronize customer subscriptions and MRR changes automatically, register your Stripe Webhook endpoint URL from your Pulse Settings page:
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-purple-300">
            https://your-api-domain.com/webhooks/stripe?company_id=YOUR_COMPANY_ID
          </div>
          <p className="text-xs text-slate-400">
            Supported Stripe webhook events: <code className="text-slate-200">customer.subscription.created</code>, <code className="text-slate-200">customer.subscription.updated</code>, <code className="text-slate-200">customer.subscription.deleted</code>, <code className="text-slate-200">invoice.payment_succeeded</code>.
          </p>
        </section>

        {/* Security & MFA */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" /> Multi-Factor Authentication (2FA)
          </h2>
          <p className="text-sm text-slate-300">
            Pulse supports TOTP 2FA. Go to <strong>Settings &gt; Multi-Factor Authentication</strong>, click <em>Enroll MFA</em>, scan the secret code into your authenticator app, and enter your 6-digit verification code.
          </p>
        </section>
      </div>
    </div>
  )
}

export default DocsPage
