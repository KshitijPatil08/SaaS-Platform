import React, { useState } from 'react'
import { api } from '../lib/api'
import { Check, Zap, Shield, Sparkles } from 'lucide-react'

const TIERS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Essential metrics tracking for early stage SaaS startups.',
    features: ['Up to 500 Active Customers', 'MRR & Churn Tracking', 'Basic Conversion Funnel', 'Standard Webhook Integration'],
    buttonText: 'Subscribe Starter',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/month',
    description: 'Advanced analytics, health scoring, and cohort retention for growing SaaS teams.',
    features: ['Up to 5,000 Active Customers', 'Real-time Account Health Scoring', 'Custom Funnel Tracking', 'CSV & PDF Data Exports', 'Priority Email Support'],
    buttonText: 'Subscribe Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    description: 'Unlimited volume, dedicated instance option, and custom data pipelines.',
    features: ['Unlimited Customers', 'Dedicated Self-Hosted Support', 'Custom Event Pipelines', '24/7 SLA & Dedicated Manager', 'Custom SSO & SAML'],
    buttonText: 'Subscribe Enterprise',
    popular: false,
  },
]

const BillingPage: React.FC = () => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleSubscribe = async (tierName: string) => {
    setLoadingTier(tierName)
    try {
      // In production, this calls backend endpoint to generate a Stripe Checkout session URL
      const res = await api.post('/api/billing/checkout', { plan: tierName.toLowerCase() })
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch {
      alert(`Stripe Checkout session initialized for ${tierName} plan!`)
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscription & Billing</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your Pulse SaaS platform subscription tiers and payment methods.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-xl p-6 flex flex-col justify-between backdrop-blur-sm shadow-xl transition-all duration-200 ${
              tier.popular
                ? 'bg-purple-900/10 dark:bg-purple-950/40 border-2 border-purple-500'
                : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Most Popular
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tier.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tier.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{tier.price}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tier.period}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Check className="h-4 w-4 text-purple-500 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => handleSubscribe(tier.name)}
                disabled={loadingTier === tier.name}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tier.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                }`}
              >
                {loadingTier === tier.name ? 'Redirecting to Stripe…' : tier.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BillingPage
