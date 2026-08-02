import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Copy, Check, ShieldCheck, Key, Building, Link as LinkIcon, RefreshCw, LogOut, User, AlertCircle, History, Gauge, Unlock, UserPlus, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

interface AdminUser {
  id: string
  email: string
  mfaEnabled: boolean
  createdAt: string
}

interface ProfileData {
  companyId: string
  companyName: string
  stripeId: string | null
  admin: {
    email: string
    mfaEnabled: boolean
  } | null
  admins: AdminUser[]
  webhookUrl: string
}

interface AuditLog {
  id: string
  email: string
  action: string
  ip: string
  userAgent: string
  details: string
  createdAt: string
}

interface LockoutStatus {
  ip: string
  status: string
  maxAllowedRequests: number
  windowMs: number
}

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Team Admin invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Audit Logs & Lockout state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [lockout, setLockout] = useState<LockoutStatus | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [resettingLockout, setResettingLockout] = useState(false)
  const [exportType, setExportType] = useState<'mrr' | 'customers' | 'churn'>('mrr')

  // Form states
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [stripeId, setStripeId] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updating, setUpdating] = useState(false)

  // MFA Enrollment states
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaOtpUrl, setMfaOtpUrl] = useState<string | null>(null)
  const [mfaTokenInput, setMfaTokenInput] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'team' | 'integrations'>('general')

  useEffect(() => {
    fetchProfile()
    fetchAuditData()
  }, [])

  // Fix #14: page title
  useEffect(() => { document.title = 'Settings | Pulse' }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await api.get('/api/auth/profile')
      setProfile(res.data)
      setCompanyName(res.data.companyName || '')
      setEmail(res.data.admin?.email || '')
      setStripeId(res.data.stripeId || '')
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/login')
        return
      }
      const errorMsg = err?.response?.data?.error || 'Could not connect to auth service'
      setLoadError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleRetryOrDemo = async () => {
    try {
      setLoading(true)
      await api.post('/api/auth/demo')
      await fetchProfile()
      await fetchAuditData()
    } catch {
      navigate('/login')
    }
  }

  const fetchAuditData = async (page = 1) => {
    setLogsLoading(true)
    try {
      const [logsRes, lockoutRes] = await Promise.all([
        api.get(`/api/audit-logs?page=${page}&pageSize=10`),
        api.get('/api/auth/lockout-status'),
      ])
      // New API returns { logs, pagination } — handle both shapes for safety
      const data = logsRes.data
      if (data?.logs) {
        setAuditLogs(data.logs)
        setAuditTotalPages(data.pagination?.totalPages ?? 1)
        setAuditTotal(data.pagination?.total ?? 0)
      } else {
        setAuditLogs(Array.isArray(data) ? data : [])
      }
      setAuditPage(page)
      setLockout(lockoutRes.data)
    } catch {
      /* ignore non-critical audit fetch failures */
    } finally {
      setLogsLoading(false)
    }
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    setMessage(null)
    try {
      await api.post('/api/auth/invite', {
        email: inviteEmail,
        password: invitePassword || undefined,
      })
      setMessage({ type: 'success', text: `Admin invitation sent to ${inviteEmail}` })
      setInviteEmail('')
      setInvitePassword('')
      setShowInviteModal(false)
      fetchProfile()
      fetchAuditData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to invite admin' })
    } finally {
      setInviting(false)
    }
  }

  const handleResetLockout = async () => {
    setResettingLockout(true)
    try {
      await api.post('/api/auth/reset-lockout')
      setMessage({ type: 'success', text: 'Rate limits & IP lockout state successfully reset' })
      fetchAuditData()
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset lockout status' })
    } finally {
      setResettingLockout(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setUpdating(true)
    try {
      const res = await api.put('/api/auth/profile', {
        companyName,
        email,
        stripeId,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      })
      setProfile(res.data)
      setCurrentPassword('')
      setNewPassword('')
      setMessage({ type: 'success', text: 'Settings updated successfully' })
      fetchAuditData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to update settings' })
    } finally {
      setUpdating(false)
    }
  }

  const handleStartMfaEnroll = async () => {
    setMessage(null)
    setMfaLoading(true)
    try {
      if (!currentPassword) {
        setMessage({ type: 'error', text: 'Enter your current password to generate 2FA secret' })
        setMfaLoading(false)
        return
      }
      const res = await api.post('/api/auth/mfa/enroll', {
        email: profile?.admin?.email,
        password: currentPassword,
      })
      setMfaSecret(res.data.secret)
      setMfaOtpUrl(res.data.otpauthUrl)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to generate 2FA secret' })
    } finally {
      setMfaLoading(false)
    }
  }

  const handleConfirmMfa = async () => {
    setMessage(null)
    setMfaLoading(true)
    try {
      await api.post('/api/auth/mfa/confirm', {
        email: profile?.admin?.email,
        token: mfaTokenInput,
      })
      setMessage({ type: 'success', text: '2FA authentication successfully enabled!' })
      setMfaSecret(null)
      setMfaOtpUrl(null)
      fetchProfile()
      fetchAuditData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Invalid 6-digit code' })
    } finally {
      setMfaLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const actionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">LOGIN SUCCESS</span>
      case 'LOGIN_FAILED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">LOGIN FAILED</span>
      case 'EXPORT_DATA':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">DATA EXPORT</span>
      case 'UPDATE_PROFILE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">PROFILE UPDATE</span>
      case 'CONFIRM_MFA':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">MFA ENROLLED</span>
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{action}</span>
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl animate-pulse">
        <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-32 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700" />
      </div>
    )
  }

  if (loadError || !profile) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Unable to load account settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {loadError || 'Your session may have expired or backend services are temporarily unreachable.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetryOrDemo}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Session
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign In Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'general' as const, label: 'General & Profile', icon: <Building className="h-4 w-4" /> },
    { id: 'security' as const, label: 'Security & Audit', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'team' as const, label: 'Team Admins', icon: <Users className="h-4 w-4" /> },
    { id: 'integrations' as const, label: 'Webhooks & API', icon: <LinkIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage organization profile, team admin invites, 2FA, rate limiting, and API integrations.
        </p>
      </div>

      {/* Account Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/20 shrink-0">
            {profile.companyName ? profile.companyName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{profile.companyName}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                Organization Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> {profile.admin?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 font-mono text-[11px]">
            ID: {profile.companyId.slice(0, 8)}…
          </span>
        </div>
      </motion.div>

      {/* Status Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Fix #8: Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 overflow-x-auto pb-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section 1: General & Profile */}
      {activeTab === 'general' && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700">
            <Building className="h-5 w-5 text-purple-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Organization Profile & Stripe Key</h2>
              <p className="text-xs text-slate-400">Update company details, admin email, and Stripe API keys</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Stripe Account / Customer ID</label>
              <input
                type="text"
                value={stripeId}
                onChange={(e) => setStripeId(e.target.value)}
                placeholder="cus_demo_xxx or acct_xxx"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Key className="h-3.5 w-3.5 text-purple-500" /> Security & Password
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required for password updates or 2FA"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md shadow-purple-500/20"
              >
                {updating ? 'Saving Profile…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.section>
      )}

      {/* Section 2: Team Admin Management */}
      {activeTab === 'team' && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Team Administrators</h2>
                <p className="text-xs text-slate-400">Invite co-admins to access this organization's analytics dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(!showInviteModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite Admin
            </button>
          </div>

          {showInviteModal && (
            <form onSubmit={handleInviteAdmin} className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
              <h3 className="text-xs font-bold text-purple-900 dark:text-purple-300">Invite New Administrator</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="coadmin@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
                <input
                  type="password"
                  placeholder="Initial password (optional)"
                  value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700"
                >
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {profile.admins?.map((adm) => (
              <div key={adm.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                    {adm.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{adm.email}</p>
                    <p className="text-[10px] text-slate-400">Added {new Date(adm.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adm.mfaEnabled ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-[10px] rounded-full">2FA Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 font-medium text-[10px] rounded-full">2FA Off</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Section 3: Security, Rate Limiting & Audit */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* MFA */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Multi-Factor Authentication (2FA)</h2>
                  <p className="text-xs text-slate-400">Protect account access with TOTP apps like Google Authenticator or 1Password</p>
                </div>
              </div>
              {profile.admin?.mfaEnabled ? (
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Enrolled
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full">
                  Not Enrolled
                </span>
              )}
            </div>

            {!profile.admin?.mfaEnabled ? (
              <div className="space-y-4 pt-1">
                {!mfaSecret ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Generate a secret key to pair your preferred authenticator app.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartMfaEnroll}
                      disabled={mfaLoading}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shrink-0"
                    >
                      {mfaLoading ? 'Generating Secret…' : 'Enroll 2FA'}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Secret Key (Enter manually in authenticator app)
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 select-all inline-block font-semibold">
                          {mfaSecret}
                        </code>
                        <button
                          onClick={() => copyToClipboard(mfaSecret)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                          Copy Secret
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Enter 6-Digit Code from Authenticator App to Verify
                      </label>
                      <div className="flex gap-2 max-w-xs">
                        <input
                          type="text"
                          maxLength={6}
                          value={mfaTokenInput}
                          onChange={(e) => setMfaTokenInput(e.target.value)}
                          placeholder="123456"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono tracking-widest text-center"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmMfa}
                          disabled={mfaLoading || mfaTokenInput.length !== 6}
                          className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Two-factor authentication is active on your administrator account.
              </p>
            )}
          </section>

          {/* Rate Limiting */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Gauge className="h-5 w-5 text-purple-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Rate Limiting & Lockout Machinery</h2>
                  <p className="text-xs text-slate-400">Monitor brute-force limiters and reset IP lockout restrictions</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                Limiter Active
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
              <div className="text-xs space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Current IP: <code className="font-mono text-purple-600 dark:text-purple-400">{lockout?.ip || '127.0.0.1'}</code>
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Max Auth Limit: <span className="font-semibold text-slate-700 dark:text-slate-300">10 attempts / 60 seconds</span>
                </p>
              </div>

              <button
                onClick={handleResetLockout}
                disabled={resettingLockout}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shrink-0"
              >
                <Unlock className="h-3.5 w-3.5" />
                {resettingLockout ? 'Resetting…' : 'Reset Lockouts'}
              </button>
            </div>
          </section>

          {/* Audit Trail - paginated */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <History className="h-5 w-5 text-purple-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Security Audit Log</h2>
                  <p className="text-xs text-slate-400">
                    Timestamped record of logins, exports, and admin actions
                    {auditTotal > 0 && <span className="ml-1 text-purple-500 font-semibold">({auditTotal} total)</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchAuditData(auditPage)}
                disabled={logsLoading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Refresh audit logs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 shadow-sm z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Action</th>
                    <th className="py-2.5 px-3">User Email</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">{actionBadge(log.action)}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{log.email}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{log.ip}</td>
                    </tr>
                  ))}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No security audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400">
                  Page {auditPage} of {auditTotalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fetchAuditData(auditPage - 1)}
                    disabled={auditPage <= 1 || logsLoading}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(auditTotalPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        onClick={() => fetchAuditData(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          p === auditPage
                            ? 'bg-purple-600 text-white'
                            : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => fetchAuditData(auditPage + 1)}
                    disabled={auditPage >= auditTotalPages || logsLoading}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </motion.div>
      )}

      {/* Section 4: Webhooks & Integrations */}
      {activeTab === 'integrations' && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Export Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <Download className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Data Export</h2>
                <p className="text-xs text-slate-400">Download your data as CSV or JSON for analysis in Excel, Google Sheets, or BI tools</p>
              </div>
            </div>

            {/* Export Type Selector */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">What to export</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'mrr' as const, label: 'MRR Snapshots', desc: 'Monthly revenue history', icon: '📈' },
                  { key: 'customers' as const, label: 'Customers', desc: 'Full customer list with plan & status', icon: '👥' },
                  { key: 'churn' as const, label: 'Churn Events', desc: 'Cancellations with reasons & MRR lost', icon: '📉' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setExportType(opt.key)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      exportType === opt.key
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-1 ring-purple-500/40'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl block mb-1.5">{opt.icon}</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{opt.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={`http://localhost:5000/api/export?format=csv&type=${exportType}&range=last_12_months`}
                download
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </a>
              <a
                href={`http://localhost:5000/api/export?format=json&type=${exportType}&range=last_12_months`}
                download
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download JSON
              </a>
            </div>
          </div>

          {/* Webhook Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700">
              <LinkIcon className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Stripe Webhook Integration</h2>
                <p className="text-xs text-slate-400">Configure this URL in Stripe Dashboard &gt; Developers &gt; Webhooks</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={profile.webhookUrl || ''}
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(profile.webhookUrl || '')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  )
}

export default Settings
