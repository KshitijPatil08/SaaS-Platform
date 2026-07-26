import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@pulse.example')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/api/auth/login', {
        email,
        password,
        ...(mfaRequired ? { mfaToken } : {}),
      })
      navigate('/')
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.mfaRequired) {
        setMfaRequired(true)
        setError('Enter your 6-digit MFA code')
      } else {
        setError(data?.error || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 space-y-4"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Pulse Login</h1>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {mfaRequired && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MFA Code</label>
            <input
              type="text"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              maxLength={6}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login
