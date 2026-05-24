import { useNavigate } from 'react-router-dom'
import { BookOpen, Gauge, LayoutDashboard, MessageSquare, FileBarChart2, ArrowRight, Sparkles } from 'lucide-react'

const tools = [
  {
    to: '/products',
    icon: BookOpen,
    color: 'cyan',
    title: 'Fiches Produits',
    description: 'Fiches complètes, analyses BtoB/BtoC et rapports PDF pour chaque véhicule.',
    badge: '2 produits',
  },
  {
    to: '/co2-malus',
    icon: Gauge,
    color: 'emerald',
    title: 'CO₂ & Malus',
    description: 'Calculateur de malus écologique sur 40 pays. Positionnement prix et fiscalité.',
    badge: '40 pays',
  },
  {
    to: '/chat',
    icon: MessageSquare,
    color: 'violet',
    title: 'Assistant IA',
    description: 'Posez toutes vos questions sur les produits, le marché ou les stratégies commerciales.',
    badge: 'Claude Sonnet 4',
  },
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    color: 'amber',
    title: 'Tableau de bord',
    description: 'KPIs, volumes de ventes, comparatifs régionaux et insights automatiques.',
    badge: 'Temps réel',
  },
  {
    to: '/reports',
    icon: FileBarChart2,
    color: 'rose',
    title: 'Rapports',
    description: 'Rapports mensuels, analyses concurrentielles et données détaillées exportables.',
    badge: '4 rapports',
  },
]

const colorMap = {
  cyan: { bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', icon: 'text-cyan-400', dot: 'bg-cyan-400' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  violet: { bg: 'bg-violet-400/10', border: 'border-violet-400/20', icon: 'text-violet-400', dot: 'bg-violet-400' },
  amber: { bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: 'text-amber-400', dot: 'bg-amber-400' },
  rose: { bg: 'bg-rose-400/10', border: 'border-rose-400/20', icon: 'text-rose-400', dot: 'bg-rose-400' },
}

export default function Hub() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="glass-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-cyan-400/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Portail Membres</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Bienvenue sur votre<br className="hidden sm:block" /> espace Autobuyunion
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Tous vos outils d'aide à la vente, d'analyse produit et de stratégie commerciale
            réunis en un seul endroit pour vos équipes et membres de la centrale.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map(({ to, icon: Icon, color, title, description, badge }) => {
          const c = colorMap[color]
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card p-5 text-left hover:border-navy-600/70 hover:shadow-cyan active:scale-[0.98]
                         transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                  <Icon size={20} className={c.icon} />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} border ${c.border} ${c.icon}`}>
                  {badge}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                {title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{description}</p>

              <div className={`flex items-center gap-1.5 text-xs font-medium ${c.icon}`}>
                Accéder <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Membres actifs', value: '847' },
          { label: 'Pays couverts', value: '40' },
          { label: 'Véhicules fiches', value: '2' },
          { label: 'Outils disponibles', value: '5' },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card px-4 py-3 text-center">
            <p className="text-xl font-bold text-cyan-400">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
