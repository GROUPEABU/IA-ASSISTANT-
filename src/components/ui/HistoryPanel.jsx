import { History, Trash2 } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

/**
 * Panneau d'historique réutilisable (localStorage via useHistory).
 *
 * Mutualise la coque identique jusque-là dupliquée dans PriceWatch, Objections,
 * PitchGenerator et Compare : en-tête + compteur, bouton « Effacer », liste de
 * boutons cliquables avec date. Seuls le libellé principal (et un badge
 * optionnel) varient d'un outil à l'autre.
 *
 * @param {object}   props
 * @param {Array}    props.items       — éléments d'historique (chacun a `savedAt`)
 * @param {function} props.onRestore   — appelé avec l'élément cliqué
 * @param {function} props.onClear     — vide l'historique
 * @param {function} props.primary     — (item) => string : libellé principal
 * @param {function} [props.badge]     — (item) => ReactNode : badge optionnel à droite
 */
export default function HistoryPanel({ items, onRestore, onClear, primary, badge }) {
  const { t } = useSettings()
  if (!items || items.length === 0) return null

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t('history_title')} ({items.length})
          </span>
        </div>
        <button onClick={onClear} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 transition">
          <Trash2 size={10} /> {t('history_clear')}
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onRestore(item)}
            className="w-full text-left px-3 py-2 rounded-xl bg-navy-900/40 border border-navy-700/30
                       hover:border-cyan-400/30 hover:bg-cyan-400/5 transition group"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{primary(item)}</p>
              {badge?.(item)}
            </div>
            <p className="text-[10px] text-slate-600">{new Date(item.savedAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
