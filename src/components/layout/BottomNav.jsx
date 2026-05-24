import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Gauge, MessageSquare, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { to: '/hub', icon: Home, label: 'Hub' },
  { to: '/products', icon: BookOpen, label: 'Produits' },
  { to: '/co2-malus', icon: Gauge, label: 'CO₂' },
  { to: '/chat', icon: MessageSquare, label: 'IA Chat' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Stats' },
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
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-cyan-400' : 'text-slate-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={clsx('w-9 h-7 flex items-center justify-center rounded-lg transition-colors', isActive && 'bg-cyan-400/10')}>
                <Icon size={17} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
