import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ShieldCheck, Lock, Eye, EyeOff, ArrowLeft, Check, AlertCircle, KeyRound } from 'lucide-react'

function calcStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Very Weak', color: 'bg-rose-500' }
  if (s === 2) return { score: s, label: 'Weak', color: 'bg-amber-500' }
  if (s === 3) return { score: s, label: 'Fair', color: 'bg-yellow-400' }
  if (s === 4) return { score: s, label: 'Strong', color: 'bg-emerald-500' }
  return { score: s, label: 'Very Strong', color: 'bg-emerald-600' }
}

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { document.title = 'Change Password | Pulse' }, [])

  const strength = calcStrength(newPw)
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw
  const canSubmit = !loading && !mismatch && currentPw.length > 0 && newPw.length >= 8

  const requirements: [string, boolean][] = [
    ['8+ characters', newPw.length >= 8],
    ['Uppercase letter', /[A-Z]/.test(newPw)],
    ['Number', /[0-9]/.test(newPw)],
    ['Passwords match', newPw.length > 0 && newPw === confirmPw],
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return }
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(newPw)) { setError('New password must contain at least one uppercase letter.'); return }
    if (!/[0-9]/.test(newPw)) { setError('New password must contain at least one number.'); return }
    setLoading(true)
    try {
      await api.put('/api/auth/profile', { currentPassword: currentPw, newPassword: newPw })
      setSuccess(true)
      setTimeout(() => navigate('/settings?tab=security'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Incorrect current password or server error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        <Link to="/settings?tab=security" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Security Settings
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 px-8 py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Change Password</h1>
              <p className="text-xs text-slate-400 mt-1">Verify your current password before setting a new one</p>
            </div>
          </div>

          <div className="px-8 py-7">
            {success ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-base font-bold text-emerald-400">Password Updated!</p>
                <p className="text-xs text-slate-400">Redirecting you back to Settings…</p>
              </div>
            ) : (
              <form id="change-password-form" onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 leading-relaxed">
                  <ShieldCheck className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  This action is logged in the Security Audit Trail. Active sessions on other devices remain until signed out separately.
                </div>

                {/* Current Password */}
                <div className="space-y-1.5">
                  <label htmlFor="cp-current" className="block text-xs font-semibold text-slate-300">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="cp-current" name="current-password" type={showCur ? 'text' : 'password'} value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password"
                      placeholder="Your current password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800" />

                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="cp-new" className="block text-xs font-semibold text-slate-300">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="cp-new" name="new-password" type={showNew ? 'text' : 'password'} value={newPw}
                      onChange={(e) => setNewPw(e.target.value)} required autoComplete="new-password"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPw.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-slate-700'}`} />
                        ))}
                      </div>
                      <p className={`text-[11px] font-semibold ${strength.score <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="cp-confirm" className="block text-xs font-semibold text-slate-300">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="cp-confirm" name="confirm-password" type={showConf ? 'text' : 'password'} value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-800 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${mismatch ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-purple-500 focus:border-transparent'}`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConf(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mismatch && <p className="text-[11px] text-rose-400 font-medium">Passwords do not match</p>}
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button id="change-password-submit" type="submit" disabled={!canSubmit}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
                    : <><ShieldCheck className="h-4 w-4" /> Update Password</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Live requirements checklist */}
        <div className="grid grid-cols-2 gap-2">
          {requirements.map(([label, met]) => (
            <div key={label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${met ? 'text-emerald-400' : 'text-slate-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${met ? 'bg-emerald-400' : 'bg-slate-700'}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage

