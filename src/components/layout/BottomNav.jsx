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
      className="bottom-nav md:hidden flex-shrink-0 px-3 pt-1.5 pb-safe"
    >
      <div
        className="bottom-nav-pill flex items-stretch rounded-2xl overflow-hidden"
      >
        {items.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 active:scale-95',
                isActive ? 'text-cyan-400' : 'text-slate-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'bottom-nav-icon w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                    isActive ? 'active' : '',
                  )}
                >
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={clsx(
                    'text-[9px] font-semibold leading-none tracking-wide transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-40',
                  )}
                >
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
