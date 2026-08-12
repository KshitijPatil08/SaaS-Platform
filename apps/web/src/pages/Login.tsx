import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Lock, ShieldCheck, Key, ArrowRight, Mail, CheckCircle, ChevronLeft } from 'lucide-react'

type Screen = 'login' | 'forgot' | 'forgot_sent'

const Login: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('admin@pulse.example')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Sign In | Pulse' }, [])

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', {
        email,
        password,
        ...(mfaRequired ? { mfaToken } : {}),
      })
      if (res.data?.mfaRequired) {
        setMfaRequired(true)
        setError('Two-Factor Authentication is enabled. Please enter your 6-digit code.')
        return
      }
      if (res.data?.success) {
        navigate('/')
      } else {
        setError(res.data?.error || 'Invalid credentials')
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.mfaRequired) {
        setMfaRequired(true)
        setError('Two-Factor Authentication is enabled. Please enter your 6-digit code.')
      } else {
        setError(data?.error || 'Login failed. Check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email: forgotEmail })
      setScreen('forgot_sent')
    } catch (err: any) {
      // Always show "sent" screen even if email not found (security best practice)
      setScreen('forgot_sent')
    } finally {
      setLoading(false)
    }
  }

  const sharedCardClass =
    'w-full max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-5'
  const sharedWrapClass =
    'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 font-sans text-slate-100 selection:bg-purple-500 selection:text-white'

  // ─── Forgot Sent Screen ────────────────────────────────────────────────────
  if (screen === 'forgot_sent') {
    return (
      <div className={sharedWrapClass}>
        <div className={sharedCardClass}>
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Check your inbox</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              If <span className="text-slate-200 font-semibold">{forgotEmail}</span> is registered,
              you'll receive a reset link shortly. Check your spam folder if it doesn't arrive.
            </p>
            <button
              onClick={() => { setScreen('login'); setError(null) }}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Forgot Password Screen ────────────────────────────────────────────────
  if (screen === 'forgot') {
    return (
      <div className={sharedWrapClass}>
        <form onSubmit={handleForgotPassword} className={sharedCardClass}>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => { setScreen('login'); setError(null) }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-3"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Reset your password</h1>
            <p className="text-xs text-slate-400">
              Enter the email address associated with your account and we'll send you a reset link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="admin@yourcompany.com"
              required
              autoFocus
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-200 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !forgotEmail}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending…' : 'Send Reset Link'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    )
  }

  // ─── Login Screen ──────────────────────────────────────────────────────────
  return (
    <div className={sharedWrapClass}>
      <form onSubmit={handleLogin} className={sharedCardClass}>
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
            {mfaRequired ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <h1 className="text-xl font-extrabold text-white">
            {mfaRequired ? 'Two-Factor Verification' : 'Welcome back to Pulse'}
          </h1>
          <p className="text-xs text-slate-400">
            {mfaRequired
              ? 'Enter the 6-digit verification code from your authenticator app.'
              : 'Sign in to access your revenue analytics and customer metrics.'}
          </p>
        </div>

        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mfaRequired}
            required
            autoComplete="email"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors"
          />
        </div>

        {!mfaRequired && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => { setScreen('forgot'); setForgotEmail(email); setError(null) }}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        )}

        {mfaRequired && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" /> 6-Digit Authenticator Code
            </label>
            <input
              type="text"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              autoFocus
              placeholder="123456"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border-2 border-purple-500/60 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-purple-300 focus:outline-none focus:border-purple-400 shadow-inner"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs text-purple-200 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mfaRequired && mfaToken.length < 6)}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {loading ? 'Verifying…' : mfaRequired ? 'Verify 2FA Code' : 'Sign In'}{' '}
          <ArrowRight className="h-4 w-4" />
        </button>

        {mfaRequired && (
          <button
            type="button"
            onClick={() => { setMfaRequired(false); setMfaToken(''); setError(null) }}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
          >
            ← Back to email & password
          </button>
        )}

        {!mfaRequired && (
          <p className="text-xs text-center text-slate-500 pt-1">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}

export default Login
