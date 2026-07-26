import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

const Register: React.FC = () => {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
      // Automatically log in after registration
      await api.post('/api/auth/login', { email, password })
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed')
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create Pulse Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start tracking your SaaS metrics in minutes</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="Acme Inc."
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
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
            placeholder="••••••••"
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          {loading ? 'Creating Account…' : 'Sign Up'}
        </button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Register
