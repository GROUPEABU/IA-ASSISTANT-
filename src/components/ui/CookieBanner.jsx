import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

const COOKIE_KEY = 'abu_cookie_consent'

export default function CookieBanner() {
  const { t }      = useSettings()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      // Small delay so the banner doesn't flash on first render
      const id = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(id)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  const dismiss = () => {
    localStorage.setItem(COOKIE_KEY, 'essential')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Paramètres des cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-3 animate-slide-up"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: 'rgba(10,27,44,0.98)',
          border: '1px solid rgba(80,229,229,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
        }}
      >
        <Cookie size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">{t('cookie_title')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            {t('cookie_desc')}{' '}
            <Link to="/politique-confidentialite" className="text-cyan-400 hover:underline">
              {t('legal_privacy')}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={dismiss}
            className="text-[11px] text-slate-400 hover:text-white transition px-2 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            {t('cookie_essential')}
          </button>
          <button
            onClick={accept}
            className="text-[11px] font-semibold text-navy-900 bg-cyan-400 hover:bg-cyan-300 transition px-3 py-1.5 rounded-lg"
          >
            {t('cookie_accept')}
          </button>
          <button
            onClick={dismiss}
            className="text-slate-500 hover:text-white transition p-1"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
