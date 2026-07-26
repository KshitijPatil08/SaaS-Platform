import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Copy, Check, ShieldCheck, Key, Building, Link as LinkIcon } from 'lucide-react'

interface ProfileData {
  companyId: string
  companyName: string
  stripeId: string | null
  admin: {
    email: string
    mfaEnabled: boolean
  } | null
  webhookUrl: string
}

const Settings: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Form states
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updating, setUpdating] = useState(false)

  // MFA Enrollment states
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaOtpUrl, setMfaOtpUrl] = useState<string | null>(null)
  const [mfaTokenInput, setMfaTokenInput] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/auth/profile')
      setProfile(res.data)
      setCompanyName(res.data.companyName)
      setEmail(res.data.admin?.email || '')
    } catch {
      setMessage({ type: 'error', text: 'Failed to load profile details' })
    } finally {
      setLoading(false)
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
        ...(newPassword ? { currentPassword, newPassword } : {}),
      })
      setProfile(res.data)
      setCurrentPassword('')
      setNewPassword('')
      setMessage({ type: 'success', text: 'Settings updated successfully' })
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
      // Prompt password for verification before generating MFA secret
      if (!currentPassword) {
        setMessage({ type: 'error', text: 'Enter your current password to enroll in MFA' })
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
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to enroll MFA' })
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
      setMessage({ type: 'success', text: 'MFA enabled successfully!' })
      setMfaSecret(null)
      setMfaOtpUrl(null)
      fetchProfile()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Invalid 6-digit MFA code' })
    } finally {
      setMfaLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage company profile, security, MFA authentication, and webhooks.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company & Admin Profile */}
      <section className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Company & Credentials</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
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
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-500" /> Change Password
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required for password or MFA changes"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {updating ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* MFA Security */}
      <section className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Multi-Factor Authentication (2FA)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Secure admin account using TOTP authenticator apps</p>
            </div>
          </div>
          {profile?.admin?.mfaEnabled ? (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Enabled
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full">
              Not Enrolled
            </span>
          )}
        </div>

        {!profile?.admin?.mfaEnabled && (
          <div className="space-y-4">
            {!mfaSecret ? (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Enroll in 2FA using Google Authenticator, 1Password, or Authy.
                </p>
                <button
                  type="button"
                  onClick={handleStartMfaEnroll}
                  disabled={mfaLoading}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  {mfaLoading ? 'Generating Secret…' : 'Enroll MFA'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-4 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    TOTP Secret Code
                  </label>
                  <code className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 select-all inline-block">
                    {mfaSecret}
                  </code>
                </div>

                {mfaOtpUrl && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Authenticator URI
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={mfaOtpUrl}
                      className="w-full text-xs font-mono px-3 py-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Enter 6-digit Code from Authenticator to Confirm
                  </label>
                  <div className="flex gap-2 max-w-xs">
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaTokenInput}
                      onChange={(e) => setMfaTokenInput(e.target.value)}
                      placeholder="123456"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono tracking-widest text-center"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmMfa}
                      disabled={mfaLoading || mfaTokenInput.length !== 6}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      Confirm & Enable
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stripe Webhook URL */}
      <section className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Stripe Webhook Endpoint</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure this URL in your Stripe Dashboard under Developers &gt; Webhooks</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={profile?.webhookUrl || ''}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(profile?.webhookUrl || '')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy URL
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}

export default Settings
