import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { BarChart3, UserPlus, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'

// ── Password strength helpers ──────────────────────────────────────────────
function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' }
  if (score === 2) return { score, label: 'Fair', color: 'bg-amber-400' }
  if (score === 3) return { score, label: 'Good', color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Strong', color: 'bg-emerald-400' }
  return { score, label: 'Very Strong', color: 'bg-emerald-500' }
}

const Register: React.FC = () => {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Fix #10: show MFA setup prompt after successful registration
  const [showMfaPrompt, setShowMfaPrompt] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Create Account | Pulse' }, [])

  const strength = password ? getStrength(password) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        companyName,
        email,
        password,
      })
      // Auto-login after registration using the new challenge endpoint (consistent with Login.tsx).
      // For brand-new accounts MFA is never pre-enabled, so this will always return success:true.
      // If somehow MFA is already on (e.g. admin-invite flow), we redirect to /mfa correctly.
      const loginRes = await api.post('/api/auth/mfa/challenge', { email, password })
      if (loginRes.data?.mfaRequired && loginRes.data?.mfaSessionToken) {
        sessionStorage.setItem('mfa_session_token', loginRes.data.mfaSessionToken)
        sessionStorage.setItem('mfa_email', email)
        navigate('/mfa', { state: { mfaSessionToken: loginRes.data.mfaSessionToken, email } })
        return
      }
      // Warm the CSRF cookie so the first dashboard mutation doesn't fail
      await api.get('/api/csrf-token')
      // Fix #10: Show MFA onboarding prompt before going to dashboard
      setShowMfaPrompt(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // ── MFA Setup Prompt (Fix #10) ─────────────────────────────────────────────
  if (showMfaPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-purple-400" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Secure your account</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your account is ready. We strongly recommend enabling{' '}
              <span className="text-slate-200 font-semibold">Two-Factor Authentication (2FA)</span>{' '}
              to protect your revenue data.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="h-4 w-4" /> Enable 2FA in Settings
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Skip for now — go to Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-600">
            You can always enable 2FA later from{' '}
            <span className="text-purple-500">Settings → Security</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Pulse
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Create your account</h1>
          <p className="text-xs text-slate-400">
            Start tracking real-time SaaS revenue metrics in minutes.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="Acme Inc."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
            {/* Fix #9: Password strength meter */}
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">
                    Use 8+ chars, uppercase, and a number
                  </p>
                  <span
                    className={`text-[10px] font-semibold ${
                      strength.score <= 1 ? 'text-rose-400' :
                      strength.score === 2 ? 'text-amber-400' :
                      strength.score === 3 ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {loading ? 'Creating Account…' : 'Get Started Free'} <ArrowRight className="h-4 w-4" />
        </button>

        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            100% data ownership — self-host ready
          </p>
          <p className="text-xs text-center text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}

export default Register
