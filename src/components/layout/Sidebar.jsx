import { NavLink } from 'react-router-dom'
import {
  MessageSquare, Settings, Car, Zap, X, Home, BookOpen, Gauge, Bell, ShieldCheck, GitCompare,
} from 'lucide-react'
import clsx from 'clsx'

const navGroups = [
  {
    label: 'Portail membres',
    items: [
      { to: '/hub', icon: Home, label: 'Accueil Hub' },
      { to: '/products', icon: BookOpen, label: 'Fiches & Rapports' },
      { to: '/co2-malus', icon: Gauge, label: 'CO₂ & Malus' },
    ],
  },
  {
    label: 'Outils de vente',
    items: [
      { to: '/price-watch', icon: Bell, label: 'Veille prix' },
      { to: '/objections', icon: ShieldCheck, label: 'Réponses objections' },
      { to: '/compare', icon: GitCompare, label: 'Comparateur' },
    ],
  },
  {
    label: 'Assistant IA',
    items: [
      { to: '/chat', icon: MessageSquare, label: 'Assistant IA' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { to: '/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={clsx(
      'flex-shrink-0 bg-navy-800/95 border-r border-navy-700/50 flex flex-col z-30 transition-transform duration-300',
      'md:relative md:translate-x-0 md:w-60',
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
            <p className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Autobuyunion</p>
            <p className="text-[10px] text-slate-500 font-medium">Portail Membres</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition">
          <X size={18} />
        </button>
      </div>

      {/* Navigation groupée */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
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
