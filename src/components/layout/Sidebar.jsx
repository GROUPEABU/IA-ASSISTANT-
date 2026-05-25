import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Settings, Zap, X, Home, BookOpen, Gauge, Bell, ShieldCheck, Mic, LogOut, Calculator,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import Logo from '@/components/ui/Logo'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { t } = useSettings()
  const navigate = useNavigate()

  const navGroups = [
    {
      labelKey: 'nav_portal',
      items: [
        { to: '/hub',       icon: Home,         labelKey: 'nav_hub' },
        { to: '/products',  icon: BookOpen,      labelKey: 'nav_products' },
        { to: '/co2-malus', icon: Gauge,         labelKey: 'nav_co2' },
      ],
    },
    {
      labelKey: 'nav_tools',
      items: [
        { to: '/price-watch', icon: Bell,        labelKey: 'nav_price_watch' },
        { to: '/objections',  icon: ShieldCheck, labelKey: 'nav_objections' },
        { to: '/pitch',       icon: Mic,         labelKey: 'nav_pitch' },
        { to: '/tco',         icon: Calculator,  labelKey: 'nav_tco' },
      ],
    },
    {
      labelKey: 'nav_ai',
      items: [
        { to: '/chat', icon: MessageSquare, labelKey: 'nav_chat' },
      ],
    },
    {
      labelKey: 'nav_account',
      items: [
        { to: '/settings', icon: Settings, labelKey: 'nav_settings' },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={clsx(
      'flex-shrink-0 bg-navy-800/98 border-r border-navy-700/50 flex flex-col z-30 transition-transform duration-300',
      'md:relative md:translate-x-0 md:w-60',
      'fixed inset-y-0 left-0 w-72',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-navy-700/50 flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-navy-700/50 rounded-lg transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-2">
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
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
          <div className="w-6 h-6 rounded-lg bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-cyan-400 leading-tight">{t('ai_operational')}</p>
            <p className="text-[10px] text-slate-500">{t('connected_ready')}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-slow flex-shrink-0" />
        </div>

        <div className="flex items-center gap-3 px-2 py-1 flex-wrap">
          <Link to="/mentions-legales"         className="text-[10px] text-slate-600 hover:text-slate-400 transition">{t('legal_mentions')}</Link>
          <span className="text-slate-700 text-[10px]">·</span>
          <Link to="/politique-confidentialite" className="text-[10px] text-slate-600 hover:text-slate-400 transition">{t('legal_privacy')}</Link>
          <span className="text-slate-700 text-[10px]">·</span>
          <Link to="/conditions-utilisation"   className="text-[10px] text-slate-600 hover:text-slate-400 transition">{t('legal_cgu')}</Link>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                            flex items-center justify-center text-navy-900 text-[11px] font-bold flex-shrink-0
                            shadow-sm shadow-cyan-400/30">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
