import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Gauge, MessageSquare, ArrowRight, Sparkles, Bell, ShieldCheck, Calculator, Mic, Globe, Zap, TrendingUp, Ruler, Boxes, Truck, History, Pin, RefreshCw, Users, ExternalLink } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { sendToTool } from '@/utils/toolBridge'
import { ukey, getSessionUserId } from '@/utils/userStorage'
import { cloudGet, cloudPut, listSharedVeilles } from '@/utils/cloudStore'

const colorMap = {
  cyan:    { bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    icon: 'text-cyan-400',    badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',       hoverBorder: '#50E5E5' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', hoverBorder: '#34d399' },
  violet:  { bg: 'bg-violet-400/10',  border: 'border-violet-400/20',  icon: 'text-violet-400',  badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20',   hoverBorder: '#a78bfa' },
  amber:   { bg: 'bg-warn/10',   border: 'border-warn/20',   icon: 'text-warn',   badge: 'bg-warn/10 text-warn border-warn/20',     hoverBorder: '#E6B450' },
  rose:    { bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: 'text-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20',       hoverBorder: '#fb7185' },
  teal:    { bg: 'bg-teal-400/10',    border: 'border-teal-400/20',    icon: 'text-teal-400',    badge: 'bg-teal-400/10 text-teal-400 border-teal-400/20',       hoverBorder: '#2dd4bf' },
  indigo:  { bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20',  icon: 'text-indigo-400',  badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20', hoverBorder: '#818cf8' },
  blue:    { bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: 'text-blue-400',    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',       hoverBorder: '#60a5fa' },
  sky:     { bg: 'bg-sky-400/10',     border: 'border-sky-400/20',     icon: 'text-sky-400',     badge: 'bg-sky-400/10 text-sky-400 border-sky-400/20',          hoverBorder: '#38bdf8' },
}

// Lecture directe des historiques par outil (mêmes clés que useHistory).
// Filtre les tombstones (marqueurs de suppression) pour ne montrer que le vivant.
function readHist(ns) {
  try {
    const arr = JSON.parse(localStorage.getItem(ukey(getSessionUserId(), `history_${ns}`)) || '[]')
    return Array.isArray(arr) ? arr.filter((i) => i && !i._tombstone) : []
  } catch { return [] }
}

const ACTIVITY_SOURCES = [
  { ns: 'pricewatch',   route: '/price-watch',    icon: Bell,        titleKey: 'tool_price_title',      label: (i) => i.searchLabel },
  { ns: 'analysestock', route: '/stock-analysis', icon: Boxes,       titleKey: 'tool_stock_title',      label: (i) => i.generatedFor },
  { ns: 'objections',   route: '/objections',     icon: ShieldCheck, titleKey: 'tool_objections_title', label: (i) => i.generatedFor },
  { ns: 'pitch',        route: '/pitch',          icon: Mic,         titleKey: 'tool_pitch_title',      label: (i) => i.generatedFor },
]

// Fusion union par id, tombstone prioritaire (cohérent avec useHistory).
function mergeHist(local, remote) {
  const map = new Map()
  for (const it of [...remote, ...local]) {
    if (!it || it.id == null) continue
    const ex = map.get(it.id)
    if (!ex) { map.set(it.id, it); continue }
    if (it._tombstone && !ex._tombstone) { map.set(it.id, it); continue }
    if (!it._tombstone && ex._tombstone) continue
    if (it._tombstone) { if ((it.deletedAt || 0) >= (ex.deletedAt || 0)) map.set(it.id, it) }
    else map.set(it.id, { ...ex, ...it, pinned: ex.pinned || it.pinned })
  }
  return [...map.values()]
}

export default function Hub() {
  const navigate = useNavigate()
  const { t } = useSettings()

  // Récupère les historiques du compte (serveur) au montage, fusionne dans le
  // localStorage et force un recalcul → l'activité récente apparaît sur tous les
  // appareils, sans avoir à ouvrir chaque outil.
  const [synced, setSynced] = useState(0)
  useEffect(() => {
    let alive = true
    const uid = getSessionUserId()
    Promise.all(ACTIVITY_SOURCES.map(async ({ ns }) => {
      const remote = await cloudGet(`history_${ns}`)
      if (remote === undefined || !Array.isArray(remote)) return false
      let local = []
      try { local = JSON.parse(localStorage.getItem(ukey(uid, `history_${ns}`)) || '[]') } catch {}
      const merged = mergeHist(Array.isArray(local) ? local : [], remote)
      try { localStorage.setItem(ukey(uid, `history_${ns}`), JSON.stringify(merged)) } catch {}
      cloudPut(`history_${ns}`, merged)
      return true
    })).then((res) => { if (alive && res.some(Boolean)) setSynced((n) => n + 1) })
    return () => { alive = false }
  }, [])

  // Veilles partagées par l'équipe (flux commun, lecture seule).
  const [teamWatches, setTeamWatches] = useState([])
  useEffect(() => {
    let alive = true
    listSharedVeilles().then((items) => { if (alive) setTeamWatches(items.slice(0, 6)) })
    return () => { alive = false }
  }, [])

  // Activité récente tous outils + veilles épinglées.
  const { recent, pinnedWatches, lastWatch } = useMemo(() => {
    const all = ACTIVITY_SOURCES.flatMap((src) =>
      readHist(src.ns).map((item) => ({ src, item }))
    )
    all.sort((a, b) => (b.item.savedAt || 0) - (a.item.savedAt || 0))
    const pw = readHist('pricewatch')
    return {
      recent: all.slice(0, 4),
      pinnedWatches: pw.filter((i) => i.pinned && i.filters).slice(0, 6),
      lastWatch: pw.find((i) => i.filters) || null,
    }
  }, [synced])

  const tools = [
    { to: '/products',   icon: BookOpen,      color: 'cyan',   titleKey: 'tool_products_title',  descKey: 'tool_products_desc',   badgeKey: 'hub_badge_ai_reports' },
    { to: '/co2-malus',  icon: Gauge,         color: 'emerald',titleKey: 'tool_co2_title',       descKey: 'tool_co2_desc',        badgeKey: 'hub_badge_40_countries' },
    { to: '/price-watch',icon: Bell,          color: 'amber',  titleKey: 'tool_price_title',     descKey: 'tool_price_desc',      badgeKey: 'hub_badge_used_new' },
    { to: '/objections', icon: ShieldCheck,   color: 'rose',   titleKey: 'tool_objections_title',descKey: 'tool_objections_desc', badgeKey: 'hub_badge_btob_btoc' },
    { to: '/tco',        icon: Calculator,    color: 'teal',   titleKey: 'tool_tco_title',       descKey: 'tool_tco_desc',        badgeKey: 'hub_badge_3_5_years' },
    { to: '/pitch',      icon: Mic,           color: 'indigo', titleKey: 'tool_pitch_title',     descKey: 'tool_pitch_desc',      badgeKey: 'hub_badge_ai' },
    { to: '/compare',    icon: Ruler,         color: 'blue',   titleKey: 'tool_compare_title',   descKey: 'tool_compare_desc',    badgeKey: 'hub_badge_ai' },
    { to: '/stock-analysis', icon: Boxes,     color: 'sky',    titleKey: 'tool_stock_title',     descKey: 'tool_stock_desc',      badgeKey: 'hub_badge_stock' },
    { to: '/logistics',  icon: Truck,         color: 'amber',  titleKey: 'tool_logistics_title', descKey: 'tool_logistics_desc',  badgeKey: 'hub_badge_trucks' },
    { to: '/chat',       icon: MessageSquare, color: 'violet', titleKey: 'tool_chat_title',      descKey: 'tool_chat_desc',       badgeKey: 'hub_badge_ai' },
  ]

  const stats = [
    // À synchroniser avec COUNTRIES de malusWorld.js (non importé ici : trop lourd pour le chunk Hub)
    { label: '52 pays',        value: '52',  icon: Globe,      color: '#50E5E5', sub: t('stat_countries') },
    { label: '10 outils',      value: '10',  icon: Zap,        color: '#a78bfa', sub: t('stat_tools') },
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

      {/* ── Reprendre (activité récente tous outils) ─────────────────────────── */}
      {(recent.length > 0 || lastWatch) && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History size={13} className="text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('hub_recent_title')}</span>
            </div>
            {lastWatch && (
              <button
                onClick={() => sendToTool(navigate, '/price-watch', { filters: lastWatch.filters })}
                className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-400/30
                           px-2.5 py-1 rounded-lg hover:bg-cyan-400/10 transition"
              >
                <RefreshCw size={11} /> {t('hub_rerun_last')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {recent.map(({ src, item }) => {
              const Icon = src.icon
              return (
                <button
                  key={`${src.ns}-${item.id ?? item.savedAt}`}
                  onClick={() => sendToTool(navigate, src.route, { restoreId: item.id ?? item.savedAt })}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-navy-900/40 border border-navy-700/30
                             hover:border-cyan-400/30 hover:bg-cyan-400/5 transition text-left group"
                >
                  <Icon size={13} className="text-slate-500 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate transition-colors">
                      {src.label(item) || t(src.titleKey)}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {t(src.titleKey)} · {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {pinnedWatches.length > 0 && (
            <div className="mt-3 pt-3 border-t border-navy-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Pin size={11} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('hub_pinned_title')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pinnedWatches.map((item) => (
                  <button
                    key={item.id ?? item.savedAt}
                    onClick={() => sendToTool(navigate, '/price-watch', { filters: item.filters })}
                    className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-navy-900/50 border border-cyan-400/20
                               px-2.5 py-1.5 rounded-lg hover:border-cyan-400/40 hover:bg-cyan-400/5 transition max-w-full"
                    title={t('hub_rerun')}
                  >
                    <RefreshCw size={10} className="text-cyan-400 flex-shrink-0" />
                    <span className="truncate max-w-[220px]">{item.searchLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Veilles de l'équipe (flux partagé, lecture seule) ────────────────── */}
      {teamWatches.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users size={13} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('pw_team_title')}</span>
            </div>
            <button
              onClick={() => navigate('/price-watch')}
              className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-400/30
                         px-2.5 py-1 rounded-lg hover:bg-cyan-400/10 transition"
            >
              {t('hub_team_all')} <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {teamWatches.map((item) => (
              <button
                key={item.id}
                onClick={() => sendToTool(navigate, '/price-watch', { sharedVeille: item })}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-navy-900/40 border border-navy-700/30
                           hover:border-cyan-400/30 hover:bg-cyan-400/5 transition text-left group"
              >
                <Bell size={13} className="text-slate-500 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate transition-colors">
                    {item.searchLabel || '—'}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">
                    {item.authorName || '—'} · {new Date(item.sharedAt).toLocaleDateString()}
                  </p>
                </div>
                <ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

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
