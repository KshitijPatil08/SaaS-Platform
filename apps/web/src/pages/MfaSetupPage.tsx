import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  ShieldCheck, Lock, Eye, EyeOff, ArrowLeft,
  Check, AlertCircle, QrCode, Copy, Smartphone,
} from 'lucide-react'

const OTP_LENGTH = 6

// Tiny QR renderer via Google Chart API (no external lib needed)
const QrImage: React.FC<{ url: string }> = ({ url }) => {
  const encoded = encodeURIComponent(url)
  const src = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encoded}`
  return (
    <img
      src={src}
      alt="Scan with your authenticator app"
      className="w-48 h-48 rounded-xl border border-slate-700 bg-white p-2 mx-auto"
    />
  )
}

const STEPS = ['Verify Identity', 'Scan QR Code', 'Confirm Code'] as const
type Step = 0 | 1 | 2

const MfaSetupPage: React.FC = () => {
  const navigate = useNavigate()

  const [step, setStep]                 = useState<Step>(0)
  const [password, setPassword]         = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [mfaSecret, setMfaSecret]       = useState<string | null>(null)
  const [otpUrl, setOtpUrl]             = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)
  const [digits, setDigits]             = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)
  const inputRefs                       = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null))

  useEffect(() => { document.title = 'Set Up 2FA | Pulse' }, [])

  // ── Step 0: verify password → get TOTP secret ─────────────────────────────
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/api/auth/mfa/enroll', { currentPassword: password })
      setMfaSecret(res.data.secret)
      setOtpUrl(res.data.otpAuthUrl)
      setStep(1)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Incorrect password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: confirm TOTP code ──────────────────────────────────────────────
  const code = digits.join('')

  const handleDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = digit
    setDigits(next)
    if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus()
    if (next.join('').length === OTP_LENGTH) handleConfirm(next.join(''))
  }

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(''))
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      handleConfirm(pasted)
    }
  }

  const handleConfirm = async (overrideCode?: string) => {
    const c = overrideCode ?? code
    if (c.length !== OTP_LENGTH) return
    setError(null)
    setLoading(true)
    try {
      await api.post('/api/auth/mfa/confirm', { token: c })
      setSuccess(true)
      setTimeout(() => navigate('/settings?tab=security'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid code — check your authenticator and try again.')
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    if (!mfaSecret) return
    navigator.clipboard.writeText(mfaSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Ambient glows */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Back link */}
        <Link to="/settings?tab=security" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Security Settings
        </Link>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 px-8 pt-6 pb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Set Up Two-Factor Authentication</h1>
                <p className="text-xs text-slate-400 mt-0.5">Protect your account with an authenticator app</p>
              </div>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-0">
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                      i < step ? 'bg-emerald-500 border-emerald-500 text-white'
                      : i === step ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/40'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold whitespace-nowrap ${i === step ? 'text-purple-400' : i < step ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mb-4 transition-all ${i < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            {success ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-base font-bold text-emerald-400">2FA Enabled!</p>
                <p className="text-xs text-slate-400">Your account is now protected. Redirecting…</p>
              </div>

            ) : step === 0 ? (
              /* ── Step 0: Password verification ── */
              <form onSubmit={handleVerifyPassword} className="space-y-5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300 leading-relaxed">
                  <Smartphone className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  You'll need Google Authenticator, Authy, 1Password, or any TOTP-compatible app on your phone.
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="mfa-current-pw" className="block text-xs font-semibold text-slate-300">
                    Confirm Your Password
                  </label>
                  <p className="text-[11px] text-slate-500">We verify your identity before generating a 2FA secret.</p>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input
                      id="mfa-current-pw"
                      name="current-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      autoFocus
                      placeholder="Your current password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading || !password}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                    : <>Continue <ArrowLeft className="h-4 w-4 rotate-180" /></>
                  }
                </button>
              </form>

            ) : step === 1 ? (
              /* ── Step 1: QR code ── */
              <div className="space-y-6">
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Open your authenticator app and scan this QR code, or enter the secret key manually.
                </p>

                {otpUrl && <QrImage url={otpUrl} />}

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Or enter manually</p>
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5">
                    <code className="flex-1 text-sm font-mono text-purple-300 select-all break-all">{mfaSecret}</code>
                    <button onClick={copySecret} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button onClick={() => setStep(2)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="h-4 w-4" /> I've Added the Account — Continue
                </button>
              </div>

            ) : (
              /* ── Step 2: Confirm TOTP code ── */
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-200">Enter the 6-digit code</p>
                  <p className="text-xs text-slate-400">Enter the code shown in your authenticator app to confirm setup.</p>
                </div>

                {/* OTP digit boxes */}
                <div className="flex gap-2.5 justify-center" onPaste={handleDigitPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el }}
                      id={`mfa-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      autoFocus={i === 0}
                      className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-slate-800 text-white focus:outline-none transition-all ${
                        d ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-700 focus:border-purple-500'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />{error}
                  </div>
                )}

                <button onClick={() => handleConfirm()} disabled={loading || code.length < OTP_LENGTH}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                    : <><ShieldCheck className="h-4 w-4" /> Activate 2FA</>
                  }
                </button>

                <button onClick={() => { setStep(1); setDigits(Array(OTP_LENGTH).fill('')); setError(null) }}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
                >
                  ← Back to QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Supported apps note */}
        {!success && step === 0 && (
          <p className="text-center text-[11px] text-slate-600">
            Works with Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden, and any TOTP app.
          </p>
        )}
      </div>
    </div>
  )
}

export default MfaSetupPage

