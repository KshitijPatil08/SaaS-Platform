import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

// ── Password strength helpers (mirrors ChangePasswordPage) ────────────────────
function calcStrength(pw: string) {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0–5
}
const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500']

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate   = useNavigate()

  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  useEffect(() => { document.title = 'Reset Password | Pulse' }, [])

  const strength = calcStrength(newPw)
  const requirements = [
    { label: 'At least 8 characters',   met: newPw.length >= 8 },
    { label: 'One uppercase letter',    met: /[A-Z]/.test(newPw) },
    { label: 'One number',              met: /[0-9]/.test(newPw) },
    { label: 'Passwords match',         met: newPw === confirmPw && confirmPw.length > 0 },
  ]
  const allMet = requirements.every(r => r.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allMet) return
    if (!token) { setError('Invalid or missing reset token.'); return }
    setError(null)
    setLoading(true)
    try {
      // Security: token is sent in the POST body, never in a query string or URL
      await api.post('/api/auth/reset-password', { token, newPassword: newPw })
      setSuccess(true)
      setTimeout(() => navigate('/login', { state: { notice: 'password_updated' } }), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'This reset link is invalid or has expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Sign In
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 px-8 pt-6 pb-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Set a New Password</h1>
              <p className="text-xs text-slate-400 mt-0.5">Choose a strong password for your account</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            {success ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-base font-bold text-emerald-400">Password Updated!</p>
                <p className="text-xs text-slate-400">Redirecting to sign in…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div className="space-y-1.5">
                  <label htmlFor="new-pw" className="block text-xs font-semibold text-slate-300">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input
                      id="new-pw"
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      required
                      autoFocus
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {newPw.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-slate-700'}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-semibold ${strength >= 4 ? 'text-emerald-400' : strength >= 3 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {STRENGTH_LABELS[strength]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-pw" className="block text-xs font-semibold text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input
                      id="confirm-pw"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all border ${
                        confirmPw.length > 0 && confirmPw !== newPw ? 'border-rose-500' : 'border-slate-700'
                      }`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Requirements checklist */}
                <div className="space-y-1.5">
                  {requirements.map(r => (
                    <div key={r.label} className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${r.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${r.met ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                        {r.met && <ShieldCheck className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {r.label}
                    </div>
                  ))}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />{error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !allMet}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
                    : <><ShieldCheck className="h-4 w-4" /> Set New Password</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage

