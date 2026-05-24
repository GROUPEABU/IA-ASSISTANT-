import { useNavigate } from 'react-router-dom'
import { BookOpen, Gauge, MessageSquare, ArrowRight, Sparkles, Bell, ShieldCheck, Calculator, Mic, Globe, Zap } from 'lucide-react'

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
    description: 'Calculateur de malus écologique sur 40 pays. Positionnement prix et fiscalité internationale.',
    badge: '40 pays',
  },
  {
    to: '/price-watch',
    icon: Bell,
    color: 'amber',
    title: 'Veille prix concurrence',
    description: 'Filtres La Centrale, LBC et L\'Argus. Prix moyen réaliste VO/VN, tendance marché et conseils.',
    badge: 'VO · VN',
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
    to: '/tco',
    icon: Calculator,
    color: 'teal',
    title: 'Calculateur TCO',
    description: 'Comparez le coût total de possession sur 3 à 5 ans : prix, malus, carburant et entretien.',
    badge: '3–5 ans',
  },
  {
    to: '/pitch',
    icon: Mic,
    color: 'indigo',
    title: 'Générateur de pitch',
    description: 'Pitch de vente IA structuré en 4 parties, adapté au profil BtoC ou BtoB du client.',
    badge: 'IA',
  },
  {
    to: '/chat',
    icon: MessageSquare,
    color: 'violet',
    title: 'Assistant IA',
    description: 'Posez toutes vos questions sur les produits, le marché ou les stratégies commerciales.',
    badge: 'IA',
  },
]

const colorMap = {
  cyan:    { bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    icon: 'text-cyan-400',    badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',       hoverBorder: '#50E5E5' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', hoverBorder: '#34d399' },
  violet:  { bg: 'bg-violet-400/10',  border: 'border-violet-400/20',  icon: 'text-violet-400',  badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20',   hoverBorder: '#a78bfa' },
  amber:   { bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: 'text-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',     hoverBorder: '#fbbf24' },
  rose:    { bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20',       hoverBorder: '#fb7185' },
  teal:    { bg: 'bg-teal-400/10',    border: 'border-teal-400/20',    icon: 'text-teal-400',    badge: 'bg-teal-400/10 text-teal-400 border-teal-400/20',       hoverBorder: '#2dd4bf' },
  indigo:  { bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20',  icon: 'text-indigo-400',  badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20', hoverBorder: '#818cf8' },
}

const stats = [
  { label: 'Pays couverts', value: '40', icon: Globe, color: '#50E5E5' },
  { label: 'Véhicules actifs', value: '12+', icon: BookOpen, color: '#7DD3FC' },
  { label: 'Outils IA', value: '7', icon: Zap, color: '#a78bfa' },
]

export default function Hub() {
  const navigate = useNavigate()

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="glass-card relative overflow-hidden p-5 md:p-8">
        {/* Background dot texture */}
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        {/* Gradient orbs */}
        <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-blue-500/6 blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-3">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Portail Membres</span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
            Bienvenue sur votre espace<br className="hidden sm:block" />
            <span className="gradient-text"> Autobuyunion</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Tous vos outils d'aide à la vente, d'analyse produit et de stratégie commerciale
            réunis en un seul endroit pour vos équipes et membres de la centrale.
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card px-3 py-3.5 text-center flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Tools grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map(({ to, icon: Icon, color, title, description, badge }) => {
          const c = colorMap[color]
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card p-4 md:p-5 text-left active:scale-[0.98]
                         transition-all duration-200 group flex flex-col gap-3"
              style={{ '--hw': c.hoverBorder }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.hoverBorder}30`; e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px ${c.hoverBorder}08` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            >
              {/* Top row: icon + badge */}
              <div className="flex items-center justify-between w-full">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>
                  {badge}
                </span>
              </div>

              {/* Title + description */}
              <div>
                <h3 className={`text-sm font-bold text-white mb-1 transition-colors duration-200 ${c.icon} group-hover:opacity-100`}
                  style={{ color: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.color = c.hoverBorder}
                  onMouseLeave={e => e.currentTarget.style.color = 'white'}
                >
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{description}</p>
              </div>

              {/* CTA */}
              <div className={`flex items-center gap-1 text-xs font-semibold mt-auto ${c.icon}`}>
                Accéder <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
