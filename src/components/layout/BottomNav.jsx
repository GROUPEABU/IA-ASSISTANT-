import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Bell, Gauge, ShieldCheck, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useSettings } from '@/contexts/SettingsContext'

export default function BottomNav() {
  const { t } = useSettings()

  const items = [
    { to: '/hub',         icon: Home,          labelKey: 'bn_hub' },
    { to: '/products',    icon: BookOpen,      labelKey: 'bn_products' },
    { to: '/price-watch', icon: Bell,          labelKey: 'bn_price' },
    { to: '/co2-malus',   icon: Gauge,         labelKey: 'bn_malus' },
    { to: '/objections',  icon: ShieldCheck,   labelKey: 'bn_objections' },
    { to: '/chat',        icon: MessageSquare, labelKey: 'bn_chat' },
  ]

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="bottom-nav md:hidden flex-shrink-0 flex items-stretch pb-safe"
      style={{ background: 'rgba(10,27,44,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
    >
      {items.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition-all duration-150',
              isActive ? 'text-cyan-400' : 'text-slate-400',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={clsx(
                'w-8 h-6 flex items-center justify-center rounded-lg transition-all duration-150',
                isActive && 'bg-cyan-400/15',
              )}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className={clsx('leading-none', isActive ? 'text-cyan-400' : 'text-slate-400')}>
                {t(labelKey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
