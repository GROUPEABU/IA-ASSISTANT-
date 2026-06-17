import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Gauge, TrendingUp, ShieldCheck, Calculator, Mic, Ruler, Boxes, Truck,
  MessageSquare, Settings, Home, Search, CornerDownLeft,
} from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

// Destinations de la palette — mêmes outils que le Hub + Accueil + Réglages.
const DESTINATIONS = [
  { to: '/hub',            icon: Home,          titleKey: 'nav_hub' },
  { to: '/products',       icon: BookOpen,      titleKey: 'tool_products_title' },
  { to: '/co2-malus',      icon: Gauge,         titleKey: 'tool_co2_title' },
  { to: '/price-watch',    icon: TrendingUp,    titleKey: 'tool_price_title' },
  { to: '/objections',     icon: ShieldCheck,   titleKey: 'tool_objections_title' },
  { to: '/tco',            icon: Calculator,    titleKey: 'tool_tco_title' },
  { to: '/pitch',          icon: Mic,           titleKey: 'tool_pitch_title' },
  { to: '/compare',        icon: Ruler,         titleKey: 'tool_compare_title' },
  { to: '/stock-analysis', icon: Boxes,         titleKey: 'tool_stock_title' },
  { to: '/logistics',      icon: Truck,         titleKey: 'tool_logistics_title' },
  { to: '/chat',           icon: MessageSquare, titleKey: 'tool_chat_title' },
  { to: '/settings',       icon: Settings,      titleKey: 'nav_settings' },
]

/**
 * Palette de commandes (Ctrl/Cmd+K ou « / ») : navigation clavier entre outils.
 * Montée une fois dans Layout ; gère elle-même son ouverture via les raccourcis.
 */
export default function CommandPalette() {
  const { t } = useSettings()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  // Raccourcis globaux : Ctrl/Cmd+K toggle · « / » ouvre (hors champ de saisie).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.key === '/' && !open) {
        const el = document.activeElement
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
        if (!typing) {
          e.preventDefault()
          setOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Reset + focus à chaque ouverture.
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // Focus après le rendu du portail.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const results = DESTINATIONS.filter((d) => !q || t(d.titleKey).toLowerCase().includes(q))
  const sel = Math.min(selected, Math.max(0, results.length - 1))

  const go = (to) => {
    setOpen(false)
    navigate(to)
  }

  const onInputKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel].to) }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh] px-4"
      role="dialog" aria-modal="true" aria-label={t('palette_ph')}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md glass-card overflow-hidden shadow-2xl shadow-black/50 animate-fade-in">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-navy-700/40">
          <Search size={15} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onInputKey}
            placeholder={t('palette_ph')}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
          />
          <kbd className="text-[9px] font-bold text-slate-600 border border-navy-600/50 rounded px-1.5 py-0.5 flex-shrink-0">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="text-xs text-slate-600 px-4 py-3">{t('palette_empty')}</p>
          )}
          {results.map((d, i) => {
            const Icon = d.icon
            const active = i === sel
            return (
              <button
                key={d.to}
                onClick={() => go(d.to)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  active ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-300 hover:bg-navy-700/30'
                }`}
              >
                <Icon size={15} className={active ? 'text-cyan-400' : 'text-slate-500'} />
                <span className="text-sm font-medium flex-1 truncate">{t(d.titleKey)}</span>
                {active && <CornerDownLeft size={13} className="text-slate-500" />}
              </button>
            )
          })}
        </div>

        <div className="px-4 py-2 border-t border-navy-700/40">
          <p className="text-[10px] text-slate-600">{t('palette_hint')}</p>
        </div>
      </div>
    </div>
  )
}
