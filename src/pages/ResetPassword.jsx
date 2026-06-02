import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { readResetToken, consumeResetToken, recordOtpAttempt, isOtpLocked } from '@/utils/passwordReset'

// ── Password validation ───────────────────────────────────────────────────────
const PASSWORD_RULE_TESTS = [
  { key: 'minLength',    test: p => p.length >= 8,   labelKey: 'pwd_min_chars'  },
  { key: 'hasUppercase', test: p => /[A-Z]/.test(p), labelKey: 'pwd_uppercase'  },
  { key: 'hasDigit',     test: p => /\d/.test(p),    labelKey: 'pwd_digit'      },
]

function validatePassword(password, t) {
  return PASSWORD_RULE_TESTS.map(rule => ({ ...rule, label: t(rule.labelKey), ok: rule.test(password) }))
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const { t }           = useSettings()
  const { resetPassword } = useAuth()
  const navigate          = useNavigate()
  const [params]          = useSearchParams()

  const prefillUser = params.get('user') || ''

  const [username, setUsername] = useState(prefillUser)
  const [code, setCode]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  const rules      = validatePassword(password, t)
  const allRulesOk = rules.every(r => r.ok)
  const canSubmit  = username.trim() && code.length === 6 && allRulesOk && password === confirm

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => navigate('/login'), 3000)
    return () => clearTimeout(timer)
  }, [success, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError(t('reset_error_pwd'));  return }
    if (!allRulesOk)          { setError(t('reset_error_weak')); return }

    const cleanUser = username.trim().toLowerCase()
    if (isOtpLocked(cleanUser)) {
      setError(t('reset_error_locked'))
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 400))

    const token = readResetToken(cleanUser)
    if (!token || token.code !== code || Date.now() > token.exp) {
      const remaining = recordOtpAttempt(cleanUser)
      setError(remaining > 0 ? t('reset_error_code') : t('reset_error_locked'))
      setLoading(false)
      return
    }

    consumeResetToken(cleanUser)
    await resetPassword(cleanUser, password)
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-navy-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-sm w-full text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">{t('reset_success_title')}</h2>
          <p className="text-sm text-slate-400">{t('reset_success_msg')}</p>
          <p className="text-xs text-slate-600 mt-3">{t('auto_redirect')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl scale-150" />
            <Logo size="md" className="relative" />
          </div>
        </div>

        <div className="glass-card p-6 shadow-2xl shadow-black/40">
          <h2 className="text-sm font-semibold text-white mb-1">{t('reset_title')}</h2>
          <p className="text-[11px] text-slate-500 mb-5">{t('reset_subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username — shown only when not pre-filled via URL */}
            {!prefillUser && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t('forgot_username_label')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('forgot_username_ph')}
                  autoComplete="username"
                  className="input-field"
                />
              </div>
            )}

            {/* OTP code */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t('reset_code_label')}
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('reset_code_ph')}
                inputMode="numeric"
                className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                           px-3 py-3 text-sm text-white placeholder-slate-600 text-center tracking-[0.3em]
                           focus:outline-none focus:border-warn/60 focus:ring-1 focus:ring-warn/20 transition"
              />
            </div>

            {/* New password */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t('reset_pwd_label')}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('reset_pwd_ph')}
                  autoComplete="new-password"
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                             pl-9 pr-10 py-3 text-sm text-white placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rules.map(r => (
                    <span
                      key={r.key}
                      className="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                      style={{
                        borderColor: r.ok ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)',
                        background:  r.ok ? 'rgba(52,211,153,0.08)' : 'transparent',
                        color:       r.ok ? '#34d399' : '#64748b',
                      }}
                    >
                      {r.ok ? '✓ ' : ''}{r.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t('reset_pwd_confirm')}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={t('reset_pwd_confirm_ph')}
                autoComplete="new-password"
                className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                           px-3 py-3 text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                style={{ borderColor: confirm && confirm !== password ? 'rgba(248,113,113,0.5)' : undefined }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:pointer-events-none
                         flex items-center justify-center"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                : t('reset_btn')
              }
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition"
          >
            <ArrowLeft size={12} />
            {t('forgot_back_login')}
          </Link>
        </div>
      </div>
    </div>
  )
}
