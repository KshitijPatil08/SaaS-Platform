import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { ShieldCheck, ArrowRight, ChevronLeft, AlertCircle, RefreshCw } from 'lucide-react'

const OTP_LENGTH = 6
const MAX_ATTEMPTS = 5

interface LocationState {
  mfaSessionToken?: string
  email?: string
}

const MfaVerify: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Try getting session token from router state first, then sessionStorage
  const routerState = (location.state as LocationState) || {}
  const [mfaSessionToken] = useState<string>(() => {
    return (
      routerState.mfaSessionToken ||
      sessionStorage.getItem('mfa_session_token') ||
      ''
    )
  })
  const [maskedEmail] = useState<string>(() => {
    return routerState.email || sessionStorage.getItem('mfa_email') || ''
  })

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null))

  useEffect(() => {
    document.title = 'Verify Identity | Pulse'
    // If no session token, redirect to login
    if (!mfaSessionToken) {
      navigate('/login', { replace: true })
      return
    }
    // Focus the first box on mount
    inputRefs.current[0]?.focus()
  }, [mfaSessionToken, navigate])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const submitCode = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) return
      setError(null)
      setLoading(true)
      try {
        const res = await api.post('/api/auth/mfa/verify', {
          mfaSessionToken,
          totpCode: code,
        })
        if (res.data?.success) {
          // Clean up temporary session storage
          sessionStorage.removeItem('mfa_session_token')
          sessionStorage.removeItem('mfa_email')
          navigate('/', { replace: true })
        } else {
          throw new Error('Verification failed')
        }
      } catch (err: any) {
        const message =
          err?.response?.data?.error || 'Invalid code. Please try again.'

        // Fix #6: If the 5-min MFA session token expired, redirect back to login
        // with a clear notice instead of leaving the user stuck on a broken /mfa page.
        if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid or expired')) {
          sessionStorage.removeItem('mfa_session_token')
          sessionStorage.removeItem('mfa_email')
          navigate('/login', {
            state: { notice: 'Your verification session expired. Please sign in again.' },
          })
          return
        }

        setError(message)
        setAttempts((a) => a + 1)
        setDigits(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        triggerShake()
      } finally {
        setLoading(false)
      }
    },
    [mfaSessionToken, navigate]
  )

  const handleChange = (index: number, value: string) => {
    // Handle paste
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH)
      if (pasted.length > 0) {
        const newDigits = Array(OTP_LENGTH).fill('')
        pasted.split('').forEach((ch, i) => {
          if (i < OTP_LENGTH) newDigits[i] = ch
        })
        setDigits(newDigits)
        const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1)
        inputRefs.current[nextIndex]?.focus()
        if (pasted.length === OTP_LENGTH) {
          setTimeout(() => submitCode(pasted), 50)
        }
      }
      return
    }

    const char = value.replace(/\D/g, '')
    const newDigits = [...digits]
    newDigits[index] = char
    setDigits(newDigits)

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are filled
    const combined = newDigits.join('')
    if (combined.length === OTP_LENGTH && !newDigits.includes('')) {
      setTimeout(() => submitCode(combined), 80)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newDigits = [...digits]
      if (newDigits[index]) {
        newDigits[index] = ''
        setDigits(newDigits)
      } else if (index > 0) {
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted) {
      const newDigits = Array(OTP_LENGTH).fill('')
      pasted.split('').forEach((ch, i) => { if (i < OTP_LENGTH) newDigits[i] = ch })
      setDigits(newDigits)
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1)
      inputRefs.current[nextIndex]?.focus()
      if (pasted.length === OTP_LENGTH) {
        setTimeout(() => submitCode(pasted), 50)
      }
    }
  }

  const attemptsLeft = MAX_ATTEMPTS - attempts
  const tooManyAttempts = attempts >= MAX_ATTEMPTS

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 font-sans text-slate-100 selection:bg-purple-500 selection:text-white overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }}
      />

      <div
        className={`relative w-full max-w-sm ${shake ? 'animate-shake' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease' } : {}}
      >
        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-7">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Animated shield */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10">
                <ShieldCheck className="h-8 w-8 text-purple-400" />
              </div>
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-2xl border border-purple-500/30 animate-ping opacity-30" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Two-Factor Verification
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {maskedEmail ? (
                  <>
                    Verifying identity for{' '}
                    <span className="text-slate-200 font-medium">{maskedEmail}</span>
                    <br />
                  </>
                ) : null}
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          </div>

          {/* 6-box OTP input */}
          <div>
            <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={6}
                  value={digits[i]}
                  disabled={loading || tooManyAttempts}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  className={[
                    'w-11 h-14 rounded-xl text-center text-xl font-bold font-mono tracking-widest',
                    'bg-slate-950 border-2 transition-all duration-150 outline-none',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    digits[i]
                      ? 'border-purple-500 text-purple-300 shadow-md shadow-purple-500/20'
                      : 'border-slate-700 text-slate-200 focus:border-purple-500 focus:shadow-md focus:shadow-purple-500/10',
                    error ? 'border-rose-500/70' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </div>

            {/* Hint text */}
            {!error && !tooManyAttempts && (
              <p className="text-center text-[11px] text-slate-500 mt-3">
                Code auto-submits when complete · You can paste your code
              </p>
            )}
          </div>

          {/* Error banner */}
          {error && !tooManyAttempts && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                {attemptsLeft > 0 && attemptsLeft <= 3 && (
                  <p className="text-rose-300/70 mt-0.5">
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Too many attempts */}
          {tooManyAttempts && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Too many failed attempts</p>
                <p className="text-amber-300/70 mt-0.5">
                  Please go back and sign in again.
                </p>
              </div>
            </div>
          )}

          {/* Submit button (fallback — also auto-submits on last digit) */}
          {!tooManyAttempts && (
            <button
              type="button"
              onClick={() => submitCode(digits.join(''))}
              disabled={loading || digits.join('').length < OTP_LENGTH || digits.includes('')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  Verify Code <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          {/* Footer links */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Sign In
            </button>
            <p className="text-center text-[11px] text-slate-600">
              Lost access to your authenticator?{' '}
              <button
                type="button"
                className="text-purple-500 hover:text-purple-400 transition-colors"
                onClick={() => {
                  // Placeholder for recovery code flow
                  alert('Please contact your administrator to disable MFA.')
                }}
              >
                Get help
              </button>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <ShieldCheck className="h-3 w-3 text-slate-600" />
          <span className="text-[10px] text-slate-600 tracking-wide uppercase font-medium">
            Secured by Pulse · TOTP verification
          </span>
        </div>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-5px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}

export default MfaVerify
