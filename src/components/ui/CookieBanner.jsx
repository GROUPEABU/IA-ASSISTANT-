import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

const COOKIE_KEY = 'abu_cookie_consent'

export default function CookieBanner() {
  const { t } = useSettings()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY)) return
    const id = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(id)
  }, [])

  const setConsent = (level) => {
    localStorage.setItem(COOKIE_KEY, level)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t('cookie_title')}
      className="fixed bottom-0 right-0 left-0 md:left-60 z-50 p-3 animate-slide-up"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl p-4
                   flex flex-col sm:flex-row sm:items-center gap-3"
        style={{
          background: 'rgba(10,27,44,0.98)',
          border: '1px solid rgba(80,229,229,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">{t('cookie_title')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {t('cookie_desc')}{' '}
              <Link to="/politique-confidentialite" className="text-cyan-400 hover:underline whitespace-nowrap">
                {t('legal_privacy')}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <button
            onClick={() => setConsent('essential')}
            className="flex-1 sm:flex-none text-[11px] text-slate-300 hover:text-white transition px-3 py-2
                       rounded-lg border border-white/10 hover:border-white/20 whitespace-nowrap"
          >
            {t('cookie_essential')}
          </button>
          <button
            onClick={() => setConsent('accepted')}
            className="flex-1 sm:flex-none text-[11px] font-semibold text-navy-900 bg-cyan-400 hover:bg-cyan-300
                       transition px-3 py-2 rounded-lg whitespace-nowrap"
          >
            {t('cookie_accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
