import { useLocation, useNavigate, Link, NavLink } from 'react-router-dom'
import { Menu, Settings } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'

export default function Header({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { t } = useSettings()
  const { user } = useAuth()

  const pageMap = {
    '/hub':         { titleKey: 'page_hub_title',        subKey: 'page_hub_sub' },
    '/products':    { titleKey: 'page_products_title',   subKey: 'page_products_sub' },
    '/co2-malus':   { titleKey: 'page_co2_title',        subKey: 'page_co2_sub' },
    '/chat':        { titleKey: 'page_chat_title',       subKey: 'page_chat_sub' },
    '/price-watch': { titleKey: 'page_price_title',      subKey: 'page_price_sub' },
    '/objections':  { titleKey: 'page_objections_title', subKey: 'page_objections_sub' },
    '/tco':         { titleKey: 'page_tco_title',        subKey: 'page_tco_sub' },
    '/pitch':       { titleKey: 'page_pitch_title',      subKey: 'page_pitch_sub' },
    '/compare':     { titleKey: 'dim_title',             subKey: 'dim_subtitle' },
    '/settings':    { titleKey: 'page_settings_title',   subKey: 'page_settings_sub' },
  }

  const base = '/' + pathname.split('/')[1]
  const page = pageMap[base] ?? { titleKey: '', subKey: '' }
  const isSettings = base === '/settings'

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

      <NavLink
        to="/settings"
        title={t('nav_settings')}
        className={({ isActive }) =>
          `w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border ${
            isActive
              ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30'
              : 'text-slate-300 border-navy-600/60 bg-navy-800/60 hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/8'
          }`
        }
      >
        <Settings size={17} aria-hidden="true" />
      </NavLink>
    </header>
  )
}
