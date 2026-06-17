import { useState, useEffect, useRef } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, X, Home, BookOpen, Gauge, Bell, ShieldCheck, Mic, LogOut,
  Calculator, Ruler, Boxes, Truck, PanelLeftClose, PanelLeftOpen,
  Settings, ChevronsUpDown,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import Logo from '@/components/ui/Logo'
import DailyQuotaBar from '@/components/ui/DailyQuotaBar'
import { getAvatar } from '@/utils/avatarStore'
import { displayName, displayInitials } from '@/utils/profileStore'

const COLLAPSE_KEY = 'abu_sidebar_collapsed'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { t } = useSettings()
  const navigate = useNavigate()

  const [avatar, setAvatar] = useState(() => getAvatar(user?.id ?? null))
  const [, forceRefresh] = useState(0)
  useEffect(() => {
    const refresh = () => { setAvatar(getAvatar(user?.id ?? null)); forceRefresh(n => n + 1) }
    window.addEventListener('abu:avatar', refresh)
    window.addEventListener('abu:profile', refresh)
    return () => {
      window.removeEventListener('abu:avatar', refresh)
      window.removeEventListener('abu:profile', refresh)
    }
  }, [user?.id])

  const name = displayName(user)
  const initials = displayInitials(user)

  // Repli de la sidebar (mode icônes) — desktop uniquement, mémorisé.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const toggleCollapsed = () => setCollapsed((v) => {
    const nv = !v
    try { localStorage.setItem(COLLAPSE_KEY, nv ? '1' : '0') } catch {}
    return nv
  })

  // Menu profil déroulant (Paramètres / Déconnexion) — fermé au clic extérieur.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

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
        // TCO masqué temporairement — réafficher en décommentant cette ligne.
        // { to: '/tco',         icon: Calculator,  labelKey: 'nav_tco' },
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

  // `collapsed && 'md:…'` : le repli n'agit que sur desktop ; le tiroir mobile
  // (w-72, overlay) reste toujours déplié.
  const hideOnCollapse = collapsed ? 'md:hidden' : ''

  return (
    <aside className={clsx(
      'flex-shrink-0 bg-navy-900 border-r border-navy-700/60 flex flex-col z-30 transition-[transform,width] duration-300',
      'md:relative md:translate-x-0',
      collapsed ? 'md:w-[4.75rem] lg:w-[4.75rem]' : 'md:w-60 lg:w-68',
      'fixed inset-y-0 left-0 w-72',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      {/* En-tête : logo + bouton repli (desktop) / fermeture (mobile) */}
      <div className={clsx(
        'h-14 md:h-16 border-b border-navy-700/50 flex items-center flex-shrink-0',
        collapsed ? 'px-4 justify-between md:px-2 md:justify-center' : 'px-4 justify-between',
      )}>
        <Link
          to="/hub"
          onClick={onClose}
          className={clsx('items-center hover:opacity-80 transition-opacity', collapsed ? 'flex md:hidden' : 'flex')}
        >
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-1">
          {/* Repli / dépli — desktop uniquement */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            title={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            className="hidden md:flex w-8 h-8 items-center justify-center text-slate-500 hover:text-white hover:bg-navy-700/50 rounded-lg transition"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          {/* Fermeture — mobile uniquement */}
          <button
            onClick={onClose}
            aria-label={t('close') || 'Fermer'}
            className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-navy-700/50 rounded-lg transition"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.labelKey}>
            <p className={clsx('text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2', hideOnCollapse)}>
              {t(group.labelKey)}
            </p>
            {/* Séparateur fin entre groupes en mode replié (desktop) */}
            {collapsed && gi > 0 && <div className="hidden md:block h-px bg-navy-700/50 mx-2 mb-3 -mt-2" />}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, labelKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  title={collapsed ? t(labelKey) : undefined}
                  className={({ isActive }) => clsx(
                    'nav-item',
                    isActive && 'nav-item-active',
                    collapsed && 'md:justify-center md:px-0',
                  )}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className={hideOnCollapse}>{t(labelKey)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-navy-700/50 space-y-2">
        {/* Jauge du jour — version complète (dépliée / mobile) */}
        <div className={hideOnCollapse}>
          <DailyQuotaBar onNavigate={onClose} />
        </div>
        {/* Jauge du jour — version compacte (desktop replié) */}
        {collapsed && (
          <Link
            to="/settings#usage"
            onClick={onClose}
            title={t('quota_daily_label')}
            className="hidden md:flex w-9 h-9 mx-auto items-center justify-center rounded-xl border border-navy-700/50 bg-navy-900/40 text-cyan-400 hover:border-cyan-400/30 transition"
          >
            <Gauge size={16} />
          </Link>
        )}

        {/* Profil — déclencheur d'un menu déroulant (Paramètres / Déconnexion) */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title={collapsed ? name : undefined}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={clsx(
                'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors group',
                menuOpen ? 'bg-navy-800/60' : 'hover:bg-navy-800/40',
                collapsed && 'md:justify-center md:px-0',
              )}
            >
              <div className="relative flex-shrink-0">
                {avatar
                  ? <img src={avatar} alt="avatar"
                         className="w-8 h-8 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform ring-1 ring-cyan-400/30" />
                  : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                                    flex items-center justify-center text-navy-900 text-[11px] font-bold
                                    shadow-sm shadow-cyan-400/30 group-hover:scale-105 transition-transform">
                      {initials}
                    </div>
                  )
                }
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-navy-900 animate-pulse-slow"
                  title={t('connected_label')}
                  aria-label={t('connected_label')}
                />
              </div>
              <div className={clsx('flex-1 min-w-0 text-left', hideOnCollapse)}>
                <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">{name}</p>
                <p className="text-[10px] text-slate-500 capitalize leading-tight">{user.role}</p>
              </div>
              <ChevronsUpDown size={14} className={clsx('text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition-colors', hideOnCollapse)} />
            </button>

            {/* Popover du menu */}
            {menuOpen && (
              <div
                role="menu"
                className={clsx(
                  'absolute z-50 bottom-full mb-2 rounded-xl border border-navy-700/70 bg-navy-800 shadow-xl shadow-black/40 overflow-hidden py-1 animate-fade-in',
                  collapsed ? 'left-0 md:left-full md:bottom-0 md:mb-0 md:ml-2 w-52' : 'left-0 right-0',
                )}
              >
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onClose?.() }}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-navy-700/60 hover:text-white transition-colors"
                >
                  <Settings size={15} className="flex-shrink-0 text-slate-400" />
                  {t('nav_settings')}
                </Link>
                <div className="h-px bg-navy-700/60 my-1" />
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                >
                  <LogOut size={15} className="flex-shrink-0" />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
