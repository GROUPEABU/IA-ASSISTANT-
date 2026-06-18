import { useState } from 'react'
import { History, Trash2, X, Pin, Search, Users } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function HistoryPanel({
  items, onRestore, onRemove, onClear, onTogglePin, primary, badge,
  onShareItem, shareTitle, onItemDragStart, onItemDragEnd,
}) {
  const { t } = useSettings()
  const [query, setQuery] = useState('')
  if (!items || items.length === 0) return null

  // Largeur réservée aux boutons d'action à droite (pin / partager / supprimer).
  const actionCount = (onTogglePin ? 1 : 0) + (onShareItem ? 1 : 0) + (onRemove ? 1 : 0)
  const padRight = actionCount >= 3 ? 'pr-[5.25rem]' : actionCount === 2 ? 'pr-14' : 'pr-8'

  // Filtre sur le libellé principal ET la date affichée — les index d'origine
  // sont conservés pour que suppression / épinglage visent toujours le bon élément.
  const q = query.trim().toLowerCase()
  const haystack = (item) => {
    const main = String(primary(item) || '')
    let date = ''
    try { date = item.savedAt ? new Date(item.savedAt).toLocaleString() : '' } catch {}
    return `${main} ${date}`.toLowerCase()
  }
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !q || haystack(item).includes(q))

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <History size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t('history_title')} ({q ? `${visible.length}/${items.length}` : items.length})
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
            className="w-full bg-navy-900/60 border border-navy-700/40 rounded-lg pl-8 pr-8 py-1.5
                       text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400/40 transition"
          />
          {q && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('close') || 'Effacer'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-cyan-400 transition p-0.5 rounded"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {visible.length === 0 && (
          <p className="text-xs text-slate-600 px-1 py-2">{t('history_no_match')}</p>
        )}
        {visible.map(({ item, index }) => (
          <div
            key={item.id ?? item.savedAt ?? index}
            className="group relative"
            draggable={!!onShareItem}
            onDragStart={onShareItem ? (e) => { e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', String(primary(item) || '')) } catch {} onItemDragStart?.(item) } : undefined}
            onDragEnd={onShareItem ? () => onItemDragEnd?.() : undefined}
          >
            <button
              onClick={() => onRestore(item)}
              className={`w-full text-left px-3 py-2 ${padRight} rounded-xl bg-navy-900/40 border transition ${
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
              {onShareItem && (
                <button
                  onClick={(e) => { e.stopPropagation(); onShareItem(item) }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-600 hover:text-cyan-400 transition p-1 rounded-lg"
                  aria-label={shareTitle || t('pw_share_team')}
                  title={shareTitle || t('pw_share_team')}
                >
                  <Users size={12} />
                </button>
              )}
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
