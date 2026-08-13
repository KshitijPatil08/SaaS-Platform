import React, { useState } from 'react'
import { Sparkles, ArrowRight, CheckCircle2, Copy, Check, Key, Link as LinkIcon, Database } from 'lucide-react'
import { api } from '../lib/api'

interface OnboardingBannerProps {
  webhookUrl: string
  onDataSeeded?: () => void
}

const DISMISS_KEY = 'pulse_onboarding_dismissed'

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ webhookUrl, onDataSeeded }) => {
  const [copied, setCopied] = useState(false)
  const [stripeKey, setStripeKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  // Persist dismiss across page reloads
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  const handleCopy = () => {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripeKey) return
    setKeyError(null)
    try {
      await api.put('/api/auth/profile', { stripeId: stripeKey })
      setKeySaved(true)
    } catch (err: any) {
      setKeyError(err?.response?.data?.error || 'Failed to save Stripe account ID')
    }
  }

  // Seed 6 realistic demo customers via the webhook simulator so the dashboard
  // charts and KPI cards have meaningful data to display immediately.
  const handleSeedData = async () => {
    setSeeding(true)
    setSeedError(null)
    const DEMO_CUSTOMERS: Array<{ email: string; mrrUsd: number }> = [
      { email: 'alice@acme.com',       mrrUsd: 299 },
      { email: 'bob@globex.com',       mrrUsd: 149 },
      { email: 'carol@initech.com',    mrrUsd: 499 },
      { email: 'dave@umbrella.com',    mrrUsd: 99  },
      { email: 'eve@hooli.com',        mrrUsd: 199 },
      { email: 'frank@piedpiper.com',  mrrUsd: 349 },
    ]
    try {
      // Create all as active subscribers
      await Promise.all(
        DEMO_CUSTOMERS.map(({ email, mrrUsd }) =>
          api.post('/api/webhooks-simulator/simulate', {
            eventType: 'subscription_created',
            customerEmail: email,
            mrrUsd,
          })
        )
      )
      // Simulate one churn and one past_due for realistic spread
      await api.post('/api/webhooks-simulator/simulate', {
        eventType: 'subscription_deleted',
        customerEmail: 'dave@umbrella.com',
        mrrUsd: 99,
      })
      await api.post('/api/webhooks-simulator/simulate', {
        eventType: 'payment_failed',
        customerEmail: 'frank@piedpiper.com',
        mrrUsd: 349,
      })
      setSeedDone(true)
      // Notify parent to invalidate and refetch all dashboard queries
      if (onDataSeeded) onDataSeeded()
      // Dismiss the banner after a short delay so the user sees the success state
      setTimeout(handleDismiss, 1500)
    } catch (err: any) {
      setSeedError(err?.response?.data?.error || 'Failed to seed sample data — please try again.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/90 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-purple-500/30 relative overflow-hidden mb-6">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="h-32 w-32 text-purple-400" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">Welcome to Pulse SaaS Analytics!</h2>
              <p className="text-xs text-purple-200">Complete your quick 3-step setup to unlock real-time revenue intelligence</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-purple-300 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Step 1 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> 1. Webhook URL
              </span>
              {copied && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-300">Copy your endpoint into Stripe Dashboard &gt; Webhooks</p>
            <button
              onClick={handleCopy}
              className="w-full py-1.5 px-3 bg-purple-600/60 hover:bg-purple-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied URL' : 'Copy Webhook URL'}
            </button>
          </div>

          {/* Step 2 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" /> 2. Stripe Account ID
              </span>
              {keySaved && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <form onSubmit={handleSaveKey} className="flex gap-1.5">
              <input
                type="text"
                placeholder="acct_xxx or cus_xxx"
                value={stripeKey}
                onChange={e => setStripeKey(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-slate-900/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-semibold"
              >
                Save
              </button>
            </form>
            {keyError && <p className="text-[10px] text-rose-400 font-medium mt-1">{keyError}</p>}
          </div>

          {/* Step 3 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> 3. Test Demo Data
              </span>
              {seedDone && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-300">Populate sample metrics to preview dashboard charts</p>
            <button
              onClick={handleSeedData}
              disabled={seeding || seedDone}
              className="w-full py-1.5 px-3 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {seeding ? (
                <><ArrowRight className="h-3.5 w-3.5 animate-spin" /> Seeding data…</>
              ) : seedDone ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Data loaded!  Refreshing…</>
              ) : (
                <><ArrowRight className="h-3.5 w-3.5" /> Load Sample Data</>
              )}
            </button>
            {seedError && <p className="text-[10px] text-rose-400 font-medium mt-1">{seedError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
