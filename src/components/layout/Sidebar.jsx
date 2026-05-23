import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, FileBarChart2,
  Settings, Car, Zap, X,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/chat', icon: MessageSquare, label: 'Assistant IA' },
  { to: '/reports', icon: FileBarChart2, label: 'Rapports' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={clsx(
      'flex-shrink-0 bg-navy-800/95 border-r border-navy-700/50 flex flex-col z-30 transition-transform duration-300',
      // Desktop : toujours visible
      'md:relative md:translate-x-0 md:w-60',
      // Mobile : drawer fixe
      'fixed inset-y-0 left-0 w-72',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      {/* Logo */}
      <div className="p-5 border-b border-navy-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <Car size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">
              Autobuyunion
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Assistant IA Ventes</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx('nav-item', isActive && 'nav-item-active')
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-navy-700/50 pb-safe">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-cyan-400/5 border border-cyan-400/10">
          <Zap size={14} className="text-cyan-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-cyan-400">IA Active</p>
            <p className="text-[10px] text-slate-500">Claude Sonnet 4</p>
          </div>
          <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse-slow" />
        </div>
      </div>
    </aside>
  )
}
