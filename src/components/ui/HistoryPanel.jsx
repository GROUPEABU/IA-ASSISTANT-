import { useState } from 'react'
import { History, Trash2, X, Pin, Search } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function HistoryPanel({ items, onRestore, onRemove, onClear, onTogglePin, primary, badge }) {
  const { t } = useSettings()
  const [query, setQuery] = useState('')
  if (!items || items.length === 0) return null

  // Filtre sur le libellé principal — les index d'origine sont conservés pour
  // que suppression / épinglage visent toujours le bon élément.
  const q = query.trim().toLowerCase()
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !q || String(primary(item) || '').toLowerCase().includes(q))

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <History size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t('history_title')} ({items.length})
          </span>
        </div>
        <button onClick={onClear} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 transition flex-shrink-0">
          <Trash2 size={10} /> {t('history_clear')}
        </button>
      </div>

      {items.length > 5 && (
        <div className="relative mb-2">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('history_search_ph')}
            className="w-full bg-navy-900/60 border border-navy-700/40 rounded-lg pl-8 pr-3 py-1.5
                       text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400/40 transition"
          />
        </div>
      )}

      <div className="space-y-1.5">
        {visible.length === 0 && (
          <p className="text-xs text-slate-600 px-1 py-2">{t('history_no_match')}</p>
        )}
        {visible.map(({ item, index }) => (
          <div key={item.id ?? item.savedAt ?? index} className="group relative">
            <button
              onClick={() => onRestore(item)}
              className={`w-full text-left px-3 py-2 ${onTogglePin ? 'pr-14' : 'pr-8'} rounded-xl bg-navy-900/40 border transition ${
                item.pinned ? 'border-cyan-400/25 bg-cyan-400/5' : 'border-navy-700/30 hover:border-cyan-400/30 hover:bg-cyan-400/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate flex items-center gap-1.5">
                  {item.pinned && <Pin size={10} className="text-cyan-400 flex-shrink-0" />}
                  <span className="truncate">{primary(item)}</span>
                </p>
                {badge?.(item)}
              </div>
              <p className="text-[10px] text-slate-600">{new Date(item.savedAt).toLocaleString()}</p>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {onTogglePin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTogglePin(index) }}
                  className={`p-1 rounded-lg transition ${
                    item.pinned
                      ? 'text-cyan-400 hover:text-slate-400'
                      : 'text-slate-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                  aria-label={item.pinned ? t('history_unpin') : t('history_pin')}
                  title={item.pinned ? t('history_unpin') : t('history_pin')}
                >
                  <Pin size={12} />
                </button>
              )}
              {onRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(index) }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-600 hover:text-red-400 transition p-1 rounded-lg"
                  aria-label={t('history_delete')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
