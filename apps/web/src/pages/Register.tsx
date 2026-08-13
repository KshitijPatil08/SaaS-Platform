import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { BarChart3, UserPlus, ArrowRight, CheckCircle2 } from 'lucide-react'

const Register: React.FC = () => {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Fix #14: page title
  useEffect(() => { document.title = 'Create Account | Pulse' }, [])

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
      // Auto-login after registration — the login endpoint sets HttpOnly cookies.
      // We must await this fully before navigating so the browser can store the
      // Set-Cookie headers. Then we hit /api/csrf-token to confirm the session
      // is live before the dashboard's queries fire.
      await api.post('/api/auth/login', { email, password })
      // Warm the CSRF cookie so the first dashboard mutation doesn't fail
      await api.get('/api/csrf-token')
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
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
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
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
