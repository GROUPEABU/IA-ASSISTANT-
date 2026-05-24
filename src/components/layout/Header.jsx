import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const pageTitles = {
  '/hub':         { title: 'Portail Membres', sub: 'Bienvenue sur votre espace Autobuyunion' },
  '/products':    { title: 'Fiches & Rapports', sub: 'Catalogue et fiches produits' },
  '/co2-malus':   { title: 'CO₂ & Malus', sub: 'Calculateur de fiscalité automobile' },
  '/chat':        { title: 'Assistant IA', sub: 'Posez vos questions commerciales' },
  '/price-watch': { title: 'Veille prix', sub: 'Prix marché en temps réel' },
  '/objections':  { title: 'Réponses aux objections', sub: 'Arguments de vente prêts à l\'emploi' },
  '/tco':         { title: 'Calculateur TCO', sub: 'Coût total de possession sur 3–5 ans' },
  '/pitch':       { title: 'Générateur de pitch', sub: 'Pitch de vente IA adapté au profil client' },
  '/settings':    { title: 'Paramètres', sub: 'Configuration de votre compte' },
}

export default function Header({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const base = '/' + pathname.split('/')[1]
  const page = pageTitles[base] ?? { title: '', sub: '' }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 md:h-16 flex-shrink-0 bg-navy-800/50 border-b border-navy-700/50 flex items-center px-4 md:px-6 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-9 h-9 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition"
      >
        <Menu size={20} />
      </button>

      {/* Page info */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm md:text-base font-semibold text-white truncate">{page.title}</h1>
        <p className="text-[10px] md:text-xs text-slate-500 hidden sm:block">{page.sub}</p>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {user && (
          <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[120px]">
            {user.name}
          </span>
        )}
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                        flex items-center justify-center text-navy-900 text-xs font-bold">
          {user?.initials ?? 'AB'}
        </div>
        {/* Logout — desktop */}
        <button
          onClick={handleLogout}
          title="Se déconnecter"
          className="hidden md:flex w-9 h-9 rounded-lg border border-navy-700/50 items-center justify-center
                     text-slate-400 hover:text-red-400 hover:border-red-400/30 transition"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
