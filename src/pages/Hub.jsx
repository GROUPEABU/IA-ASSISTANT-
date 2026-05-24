import { useNavigate } from 'react-router-dom'
import { BookOpen, Gauge, MessageSquare, ArrowRight, Sparkles, Bell, ShieldCheck, GitCompare } from 'lucide-react'

const tools = [
  {
    to: '/products',
    icon: BookOpen,
    color: 'cyan',
    title: 'Fiches & Rapports Produits',
    description: 'Fiches techniques, analyse de marché VN/VO, rapport BtoB/BtoC et export PDF pour chaque véhicule.',
    badge: 'Rapports IA',
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
    to: '/price-watch',
    icon: Bell,
    color: 'amber',
    title: 'Veille prix concurrence',
    description: 'Prix marché en temps réel depuis La Centrale, Le Bon Coin et L\'Argus. Tendance, cote et conseils achat/vente.',
    badge: 'Temps réel',
  },
  {
    to: '/objections',
    icon: ShieldCheck,
    color: 'rose',
    title: 'Réponses aux objections',
    description: 'Générez 10 objections clients fréquentes avec réponses percutantes pour n\'importe quel véhicule.',
    badge: 'BtoB · BtoC',
  },
  {
    to: '/compare',
    icon: GitCompare,
    color: 'violet',
    title: 'Comparateur de modèles',
    description: 'Comparez 2 ou 3 véhicules côte à côte : prix, malus, specs. Verdict IA avec recommandation BtoB/BtoC.',
    badge: '2–3 véhicules',
  },
  {
    to: '/chat',
    icon: MessageSquare,
    color: 'cyan',
    title: 'Assistant IA',
    description: 'Posez toutes vos questions sur les produits, le marché ou les stratégies commerciales.',
    badge: 'IA',
  },
]

const colorMap = {
  cyan:    { bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    icon: 'text-cyan-400',    badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  violet:  { bg: 'bg-violet-400/10',  border: 'border-violet-400/20',  icon: 'text-violet-400',  badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20' },
  amber:   { bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: 'text-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  rose:    { bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20' },
}

export default function Hub() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="glass-card p-5 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-cyan-400/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Portail Membres</span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
            Bienvenue sur votre<br className="hidden sm:block" /> espace Autobuyunion
          </h1>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Tous vos outils d'aide à la vente, d'analyse produit et de stratégie commerciale
            réunis en un seul endroit pour vos équipes et membres de la centrale.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map(({ to, icon: Icon, color, title, description, badge }) => {
          const c = colorMap[color]
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card p-4 md:p-5 text-left hover:border-navy-600 active:scale-[0.98]
                         transition-all duration-200 group flex flex-col gap-3"
            >
              {/* Top row: icon + badge */}
              <div className="flex items-center justify-between w-full">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>
                  {badge}
                </span>
              </div>

              {/* Title + description */}
              <div>
                <h3 className={`text-sm font-bold text-white mb-1 group-hover:${c.icon} transition-colors`}>
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>

              {/* CTA */}
              <div className={`flex items-center gap-1 text-xs font-semibold ${c.icon} mt-auto`}>
                Accéder <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pays couverts', value: '40' },
          { label: 'Fiches produits', value: '2+' },
          { label: 'Outils disponibles', value: '6' },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card px-3 py-3 text-center">
            <p className="text-lg font-bold text-cyan-400">{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
