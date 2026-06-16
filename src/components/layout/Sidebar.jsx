import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, X, Home, BookOpen, Gauge, Bell, ShieldCheck, Mic, LogOut,
  Calculator, Ruler, Boxes, Truck,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import Logo from '@/components/ui/Logo'
import DailyQuotaBar from '@/components/ui/DailyQuotaBar'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { t } = useSettings()
  const navigate = useNavigate()

  const navGroups = [
    {
      labelKey: 'nav_portal',
      items: [
        { to: '/hub',        icon: Home,              labelKey: 'nav_hub' },
        { to: '/products',   icon: BookOpen,           labelKey: 'nav_products' },
        { to: '/co2-malus',  icon: Gauge,              labelKey: 'nav_co2' },
      ],
    },
    {
      labelKey: 'nav_tools',
      items: [
        { to: '/price-watch', icon: Bell,        labelKey: 'nav_price_watch' },
        { to: '/objections',  icon: ShieldCheck, labelKey: 'nav_objections' },
        { to: '/pitch',       icon: Mic,         labelKey: 'nav_pitch' },
        { to: '/tco',         icon: Calculator,  labelKey: 'nav_tco' },
        { to: '/compare',     icon: Ruler,       labelKey: 'nav_compare' },
        { to: '/stock-analysis', icon: Boxes,    labelKey: 'nav_stock' },
        { to: '/logistics',      icon: Truck,    labelKey: 'nav_logistics' },
      ],
    },
    {
      labelKey: 'nav_ai',
      items: [
        { to: '/chat', icon: MessageSquare, labelKey: 'nav_chat' },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={clsx(
      'flex-shrink-0 bg-navy-900 border-r border-navy-700/60 flex flex-col z-30 transition-transform duration-300',
      'md:relative md:translate-x-0 md:w-60 lg:w-68',
      'fixed inset-y-0 left-0 w-72',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      {/* Logo — clicking anywhere on the logo returns to Hub */}
      <div className="px-4 h-14 md:h-16 border-b border-navy-700/50 flex items-center justify-between flex-shrink-0">
        <Link to="/hub" onClick={onClose} className="flex items-center hover:opacity-80 transition-opacity">
          <Logo size="sm" />
        </Link>
        <button
          onClick={onClose}
          aria-label={t('close') || 'Fermer'}
          className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-navy-700/50 rounded-lg transition"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, labelKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
                >
                  <Icon size={16} />
                  {t(labelKey)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-navy-700/50 space-y-2">
        {/* Consommation IA du jour — visible en continu (façon Claude) */}
        <DailyQuotaBar onNavigate={onClose} />

        {/* Profil + statut « en ligne » fusionnés (footer compact, libère la nav) */}
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-navy-800/40 transition-colors">
            <Link
              to="/settings"
              onClick={onClose}
              className="flex items-center gap-2.5 flex-1 min-w-0 group"
              title={t('nav_settings')}
            >
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                                flex items-center justify-center text-navy-900 text-[11px] font-bold
                                shadow-sm shadow-cyan-400/30 group-hover:scale-105 transition-transform">
                  {user.initials}
                </div>
                {/* Pastille « connecté » — remplace l'ancienne carte de statut */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-navy-900 animate-pulse-slow"
                  title={t('connected_label')}
                  aria-label={t('connected_label')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">{user.name}</p>
                <p className="text-[10px] text-slate-500 capitalize leading-tight">{user.role}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title={t('logout')}
              className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10 flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
