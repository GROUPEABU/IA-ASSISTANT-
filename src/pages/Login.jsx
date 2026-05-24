import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Lock, User, AlertCircle, Sparkles, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import Logo from '@/components/ui/Logo'

const REMEMBER_KEY = 'abu_remember'

function useCaptcha() {
  const [challenge, setChallenge] = useState(null)
  const [answer, setAnswer]       = useState('')

  const generate = useCallback(() => {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    setChallenge({ a, b, expected: a + b })
    setAnswer('')
  }, [])

  const verify = useCallback(() => {
    if (!challenge) return true
    return parseInt(answer, 10) === challenge.expected
  }, [challenge, answer])

  return { challenge, answer, setAnswer, generate, verify }
}

function formatCountdown(ms) {
  const min = Math.ceil(ms / 60000)
  return min === 1 ? '1 minute' : `${min} minutes`
}

export default function Login() {
  const { login, getSecurityStatus, recordFailure } = useAuth()
  const { t } = useSettings()
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember]       = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [, setTick]                   = useState(0)

  const captcha = useCaptcha()
  const { isBlocked, remainingMs, attemptsLeft, failCount } = getSecurityStatus()
  const showCaptcha = failCount >= 2

  // Re-render every second while blocked (for countdown)
  useEffect(() => {
    if (!isBlocked) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [isBlocked])

  // Generate captcha when it becomes needed
  useEffect(() => {
    if (showCaptcha && !captcha.challenge) captcha.generate()
  }, [showCaptcha]) // eslint-disable-line

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        const { username: u, password: p } = JSON.parse(saved)
        setUsername(u || '')
        setPassword(p || '')
        setRemember(true)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    if (isBlocked) return

    if (showCaptcha && !captcha.verify()) {
      setError('Code de vérification incorrect.')
      captcha.generate()
      return
    }

    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 400))
    const ok = login(username, password)
    if (!ok) {
      recordFailure()
      const { isBlocked: nowBlocked, remainingMs: ms, attemptsLeft: left } = getSecurityStatus()
      if (nowBlocked) {
        setError(`Compte temporairement bloqué. Réessayez dans ${formatCountdown(ms)}.`)
      } else if (left <= 2) {
        setError(`Identifiants incorrects. ${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}.`)
      } else {
        setError(t('login_error'))
      }
      if (showCaptcha) captcha.generate()
      setLoading(false)
    } else {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: username.trim(), password }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-cyan-400/6 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-cyan-400/3 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-cyan-400/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-cyan-400/3" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl scale-150" />
            <Logo size="md" className="relative" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-2">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">{t('login_portal_badge')}</span>
          </div>
          <p className="text-xs text-slate-500">{t('login_tagline')}</p>
        </div>

        <div className="glass-card p-6 md:p-8 shadow-2xl shadow-black/40">
          <h2 className="text-base font-semibold text-white mb-1">{t('login_heading')}</h2>
          <p className="text-xs text-slate-500 mb-6">{t('login_subtitle')}</p>

          {isBlocked && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <ShieldAlert size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-400">Accès temporairement bloqué</p>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  Trop de tentatives incorrectes. Réessayez dans {formatCountdown(remainingMs)}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t('login_username')}
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('login_username_ph')}
                  autoComplete="username"
                  disabled={isBlocked}
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                             pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('login_password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition"
                >
                  {t('login_forgot')}
                </Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  disabled={isBlocked}
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                             pl-9 pr-10 py-3 text-sm text-white placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setRemember(v => !v)}
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0
                  ${remember
                    ? 'bg-cyan-400 border-cyan-400'
                    : 'bg-navy-900/80 border-navy-700/60 group-hover:border-cyan-400/40'
                  }`}
              >
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0D273C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span
                onClick={() => setRemember(v => !v)}
                className="text-xs text-slate-400 group-hover:text-slate-300 transition"
              >
                {t('login_remember')}
              </span>
            </label>

            {/* Anti-robot challenge after 2 failures */}
            {showCaptcha && captcha.challenge && !isBlocked && (
              <div className="p-3 rounded-xl bg-amber-400/6 border border-amber-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={13} className="text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-400">Vérification anti-robot</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Combien font <strong className="text-white">{captcha.challenge.a} + {captcha.challenge.b}</strong> ?
                </p>
                <input
                  type="number"
                  value={captcha.answer}
                  onChange={e => captcha.setAnswer(e.target.value)}
                  placeholder="Votre réponse"
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/60 transition"
                  inputMode="numeric"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || loading || isBlocked}
              className="w-full mt-2 py-3 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:pointer-events-none
                         flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                  {t('login_btn_loading')}
                </>
              ) : t('login_btn')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6 whitespace-pre-line">
          {t('login_footer')}
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link to="/mentions-legales" className="text-[10px] text-slate-600 hover:text-slate-400 transition">
            {t('legal_mentions')}
          </Link>
          <span className="text-slate-700">·</span>
          <Link to="/politique-confidentialite" className="text-[10px] text-slate-600 hover:text-slate-400 transition">
            {t('legal_privacy')}
          </Link>
        </div>
      </div>
    </div>
  )
}
