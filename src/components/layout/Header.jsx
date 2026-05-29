import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function Header({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { t } = useSettings()

  const pageMap = {
    '/hub':         { titleKey: 'page_hub_title',        subKey: 'page_hub_sub' },
    '/products':    { titleKey: 'page_products_title',   subKey: 'page_products_sub' },
    '/co2-malus':   { titleKey: 'page_co2_title',        subKey: 'page_co2_sub' },
    '/chat':        { titleKey: 'page_chat_title',       subKey: 'page_chat_sub' },
    '/price-watch': { titleKey: 'page_price_title',      subKey: 'page_price_sub' },
    '/objections':  { titleKey: 'page_objections_title', subKey: 'page_objections_sub' },
    '/tco':         { titleKey: 'page_tco_title',        subKey: 'page_tco_sub' },
    '/pitch':       { titleKey: 'page_pitch_title',      subKey: 'page_pitch_sub' },
    '/settings':    { titleKey: 'page_settings_title',   subKey: 'page_settings_sub' },
  }

  const base = '/' + pathname.split('/')[1]
  const page = pageMap[base] ?? { titleKey: '', subKey: '' }

  return (
    <header className="h-14 md:h-16 flex-shrink-0 border-b border-navy-700/50 flex items-center px-4 md:px-6 gap-3"
      style={{ background: 'rgba(13,39,60,0.85)', backdropFilter: 'blur(12px)' }}>
      <button
        onClick={onMenuToggle}
        aria-label="Ouvrir le menu de navigation"
        className="md:hidden w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700/50 rounded-xl transition"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm md:text-base font-semibold text-white truncate leading-tight">{t(page.titleKey)}</h1>
        <p className="text-[10px] md:text-xs text-slate-400 hidden sm:block leading-tight">{t(page.subKey)}</p>
      </div>
    </header>
  )
}
