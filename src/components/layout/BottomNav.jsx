import { NavLink } from 'react-router-dom'
import { Home, BookOpen, TrendingUp, Gauge, ShieldCheck, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useSettings } from '@/contexts/SettingsContext'
import { useToolTasks } from '@/contexts/ToolTasksContext'

const TOOL_BY_ROUTE = { '/objections': 'objections', '/chat': 'chat' }

export default function BottomNav() {
  const { t } = useSettings()
  const { tasks } = useToolTasks()

  const items = [
    { to: '/hub',         icon: Home,          labelKey: 'bn_hub' },
    { to: '/products',    icon: BookOpen,      labelKey: 'bn_products' },
    { to: '/price-watch', icon: TrendingUp,    labelKey: 'bn_price' },
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
        {items.map(({ to, icon: Icon, labelKey }) => {
          const taskStatus = TOOL_BY_ROUTE[to] ? tasks[TOOL_BY_ROUTE[to]]?.status : null
          const taskRunning = taskStatus === 'running'
          const taskReady = taskStatus === 'done'
          return (
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
                    'bottom-nav-icon relative w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                    isActive ? 'active' : '',
                  )}
                >
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    aria-hidden="true"
                  />
                  {taskRunning && (
                    <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin bg-navy-900" />
                  )}
                  {taskReady && (
                    <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-navy-900 animate-pulse-slow" />
                  )}
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
          )
        })}
      </div>
    </nav>
  )
}
