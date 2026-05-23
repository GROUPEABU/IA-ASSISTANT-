import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'

const pageTitles = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue d\'ensemble des ventes' },
  '/chat': { title: 'Assistant IA', sub: 'Posez vos questions sur les données' },
  '/reports': { title: 'Rapports', sub: 'Analyses et exports' },
  '/settings': { title: 'Paramètres', sub: 'Configuration de l\'application' },
}

export default function Header() {
  const { pathname } = useLocation()
  const page = pageTitles[pathname] ?? { title: '', sub: '' }

  return (
    <header className="h-16 flex-shrink-0 bg-navy-800/50 border-b border-navy-700/50 flex items-center px-6 gap-4">
      {/* Page info */}
      <div className="flex-1">
        <h1 className="text-base font-semibold text-white">{page.title}</h1>
        <p className="text-xs text-slate-500">{page.sub}</p>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="w-52 bg-navy-900/60 border border-navy-700/50 rounded-lg pl-9 pr-3 py-1.5
                     text-sm text-slate-300 placeholder-slate-600
                     focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
        />
      </div>

      {/* Notifications */}
      <button className="relative w-9 h-9 rounded-lg border border-navy-700/50 flex items-center justify-center
                         text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition">
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      </button>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center
                      text-navy-900 text-xs font-bold cursor-pointer">
        AB
      </div>
    </header>
  )
}
