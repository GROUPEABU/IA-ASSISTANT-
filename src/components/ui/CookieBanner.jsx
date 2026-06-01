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
      // Compact bar; on mobile it floats just above the bottom nav (≈4.75rem)
      // instead of covering it, on desktop it sits at the bottom of the content.
      className="fixed inset-x-0 bottom-[4.75rem] md:bottom-3 md:left-60 z-40 px-3 animate-slide-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="max-w-2xl mx-auto rounded-xl px-3 py-2
                   flex items-center gap-2.5"
        style={{
          background: 'rgba(10,27,44,0.98)',
          border: '1px solid rgba(80,229,229,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <Cookie size={16} className="text-cyan-400 flex-shrink-0" />
        <p className="text-[11px] text-slate-400 leading-snug flex-1 min-w-0 truncate">
          <span className="text-white font-semibold">{t('cookie_title')}</span>
          {' · '}
          <Link to="/politique-confidentialite" className="text-cyan-400 hover:underline whitespace-nowrap">
            {t('legal_privacy')}
          </Link>
        </p>
        <button
          onClick={() => setConsent('essential')}
          className="text-[11px] text-slate-300 hover:text-white transition px-2.5 py-1.5
                     rounded-lg border border-white/10 hover:border-white/20 whitespace-nowrap flex-shrink-0"
        >
          {t('cookie_essential')}
        </button>
        <button
          onClick={() => setConsent('accepted')}
          className="text-[11px] font-semibold text-navy-900 bg-cyan-400 hover:bg-cyan-300
                     transition px-2.5 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0"
        >
          {t('cookie_accept')}
        </button>
      </div>
    </div>
  )
}
