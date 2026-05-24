import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, ArrowLeft, Send, CheckCircle, Key } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useSettings } from '@/contexts/SettingsContext'
import { findUserByUsername } from '@/data/users'
import { generateOTP, storeResetToken } from '@/utils/passwordReset'

export default function ForgotPassword() {
  const { t } = useSettings()
  const [username, setUsername]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [state, setState]         = useState('idle') // 'idle' | 'success' | 'not_found'
  const [resetCode, setResetCode] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clean = username.trim().toLowerCase()
    if (!clean) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))

    if (!findUserByUsername(clean)) {
      setState('not_found')
      setLoading(false)
      return
    }

    const code = generateOTP()
    storeResetToken(clean, code)
    setResetCode(code)
    setState('success')
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-cyan-400/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-blue-500/4 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl scale-150" />
            <Logo size="md" className="relative" />
          </div>
        </div>

        <div className="glass-card p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Key size={16} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('forgot_title')}</h2>
              <p className="text-[11px] text-slate-500">{t('forgot_subtitle')}</p>
            </div>
          </div>

          {state === 'success' ? (
            <SuccessView resetCode={resetCode} username={username.trim().toLowerCase()} t={t} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t('forgot_username_label')}
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setState('idle') }}
                    placeholder={t('forgot_username_ph')}
                    autoComplete="username"
                    className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                               pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600
                               focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                  />
                </div>
                {state === 'not_found' && (
                  <p className="text-[11px] text-red-400 mt-1.5">{t('forgot_no_account')}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!username.trim() || loading}
                className="w-full py-3 rounded-xl text-sm font-bold
                           bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900
                           hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all
                           disabled:opacity-40 disabled:pointer-events-none
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                    {t('forgot_sending')}
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {t('forgot_send_btn')}
                  </>
                )}
              </button>
            </form>
          )}
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

function SuccessView({ resetCode, username, t }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">{t('forgot_success_title')}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t('forgot_success_msg')}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-400/6 border border-amber-400/25 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          {t('forgot_code_hint')}
        </p>
        <div className="text-3xl font-bold tracking-[0.4em] text-amber-400 font-mono">
          {resetCode}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Valable 15 minutes</p>
      </div>

      <Link
        to={`/reset-password?user=${encodeURIComponent(username)}`}
        className="block w-full py-3 rounded-xl text-sm font-bold text-center
                   bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                   hover:from-cyan-300 hover:to-cyan-400 transition-all active:scale-[0.98]"
      >
        {t('reset_title')} →
      </Link>
    </div>
  )
}
