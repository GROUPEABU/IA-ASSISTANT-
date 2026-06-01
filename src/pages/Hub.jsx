import { useNavigate } from 'react-router-dom'
import { BookOpen, Gauge, MessageSquare, ArrowRight, Sparkles, Bell, ShieldCheck, Calculator, Mic, Globe, Zap, TrendingUp } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

const colorMap = {
  cyan:    { bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    icon: 'text-cyan-400',    badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',       hoverBorder: '#50E5E5' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', hoverBorder: '#34d399' },
  violet:  { bg: 'bg-violet-400/10',  border: 'border-violet-400/20',  icon: 'text-violet-400',  badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20',   hoverBorder: '#a78bfa' },
  amber:   { bg: 'bg-warn/10',   border: 'border-warn/20',   icon: 'text-warn',   badge: 'bg-warn/10 text-warn border-warn/20',     hoverBorder: '#E6B450' },
  rose:    { bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20',       hoverBorder: '#fb7185' },
  teal:    { bg: 'bg-teal-400/10',    border: 'border-teal-400/20',    icon: 'text-teal-400',    badge: 'bg-teal-400/10 text-teal-400 border-teal-400/20',       hoverBorder: '#2dd4bf' },
  indigo:  { bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20',  icon: 'text-indigo-400',  badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20', hoverBorder: '#818cf8' },
}

export default function Hub() {
  const navigate = useNavigate()
  const { t } = useSettings()

  const tools = [
    { to: '/products',   icon: BookOpen,      color: 'cyan',   titleKey: 'tool_products_title',  descKey: 'tool_products_desc',   badgeKey: 'hub_badge_ai_reports' },
    { to: '/co2-malus',  icon: Gauge,         color: 'emerald',titleKey: 'tool_co2_title',       descKey: 'tool_co2_desc',        badgeKey: 'hub_badge_40_countries' },
    { to: '/price-watch',icon: Bell,          color: 'amber',  titleKey: 'tool_price_title',     descKey: 'tool_price_desc',      badgeKey: 'hub_badge_used_new' },
    { to: '/objections', icon: ShieldCheck,   color: 'rose',   titleKey: 'tool_objections_title',descKey: 'tool_objections_desc', badgeKey: 'hub_badge_btob_btoc' },
    { to: '/tco',        icon: Calculator,    color: 'teal',   titleKey: 'tool_tco_title',       descKey: 'tool_tco_desc',        badgeKey: 'hub_badge_3_5_years' },
    { to: '/pitch',      icon: Mic,           color: 'indigo', titleKey: 'tool_pitch_title',     descKey: 'tool_pitch_desc',      badgeKey: 'hub_badge_ai' },
    { to: '/chat',       icon: MessageSquare, color: 'violet', titleKey: 'tool_chat_title',      descKey: 'tool_chat_desc',       badgeKey: 'hub_badge_ai' },
  ]

  const stats = [
    { label: '40 pays',        value: '40',  icon: Globe,      color: '#50E5E5', sub: t('stat_countries') },
    { label: '7 outils',       value: '7',   icon: Zap,        color: '#a78bfa', sub: t('stat_tools') },
    { label: 'Marchés',        value: '2',   icon: TrendingUp, color: '#34d399', sub: t('stat_markets') },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="glass-card relative overflow-hidden p-5 md:p-8">
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-blue-500/6 blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-3">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">{t('hub_badge')}</span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
            {t('hub_welcome')}<br className="hidden sm:block" />
            <span className="gradient-text"> Autobuyunion</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            {t('hub_description')}
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="glass-card px-2 py-3 text-center flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <p className="text-base font-bold leading-none" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-500 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tools grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map(({ to, icon: Icon, color, titleKey, descKey, badgeKey }) => {
          const c = colorMap[color]
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass-card p-4 md:p-5 text-left active:scale-[0.98]
                         transition-all duration-200 group flex flex-col gap-3"
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.hoverBorder}30`; e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px ${c.hoverBorder}08` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>
                  {t(badgeKey)}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1 transition-colors duration-200"
                  onMouseEnter={e => e.currentTarget.style.color = c.hoverBorder}
                  onMouseLeave={e => e.currentTarget.style.color = 'white'}
                >
                  {t(titleKey)}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t(descKey)}</p>
              </div>

              <div className={`flex items-center gap-1 text-xs font-semibold mt-auto ${c.icon}`}>
                {t('hub_access')} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
