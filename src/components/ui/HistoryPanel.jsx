import { History, Trash2, X } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function HistoryPanel({ items, onRestore, onRemove, onClear, primary, badge }) {
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
          <div key={i} className="group relative">
            <button
              onClick={() => onRestore(item)}
              className="w-full text-left px-3 py-2 pr-8 rounded-xl bg-navy-900/40 border border-navy-700/30
                         hover:border-cyan-400/30 hover:bg-cyan-400/5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{primary(item)}</p>
                {badge?.(item)}
              </div>
              <p className="text-[10px] text-slate-600">{new Date(item.savedAt).toLocaleString()}</p>
            </button>
            {onRemove && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(i) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                           text-slate-600 hover:text-red-400 transition p-1 rounded-lg"
                aria-label="Supprimer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
