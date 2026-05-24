import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Bell, Gauge, ShieldCheck, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { to: '/hub',        icon: Home,         label: 'Hub' },
  { to: '/products',   icon: BookOpen,     label: 'Produits' },
  { to: '/price-watch',icon: Bell,         label: 'Prix' },
  { to: '/co2-malus',  icon: Gauge,        label: 'Malus' },
  { to: '/objections', icon: ShieldCheck,  label: 'Objections' },
  { to: '/chat',       icon: MessageSquare,label: 'IA Chat' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-10
                    bg-navy-800/95 border-t border-navy-700/50
                    flex items-stretch pb-safe">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-medium transition-colors',
              isActive ? 'text-cyan-400' : 'text-slate-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={clsx('w-8 h-6 flex items-center justify-center rounded-lg transition-colors', isActive && 'bg-cyan-400/10')}>
                <Icon size={16} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
