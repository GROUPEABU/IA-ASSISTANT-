import { COUNTRIES, RELIABILITY_CONFIG } from '@/utils/malusWorld'
import { useSettings } from '@/contexts/SettingsContext'
import { sevColor } from '../constants'

/**
 * Compare-mode view: select up to 6 countries, run the comparison, see ranked results.
 */
export default function CompareView({
  selectedForCompare, onToggleCountry, onRunCompare,
  compareResults, emission, weight, panelRef,
}) {
  const { t } = useSettings()
  return (
    <>
      <CountryCheckboxGrid
        selected={selectedForCompare}
        onToggle={onToggleCountry}
      />

      {selectedForCompare.length >= 2 && (
        <div className="flex items-center justify-between gap-3 px-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{selectedForCompare.length} {t('malus_compare_countries_label')} :</span>
            <div className="flex gap-0.5">
              {selectedForCompare.map(c => (
                <span key={c.code} className="text-lg leading-none">{c.flag}</span>
              ))}
            </div>
          </div>
          <button
            onClick={onRunCompare}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-cyan-400/40 text-cyan-400 active:scale-95 transition"
            style={{ background: 'rgba(80,229,229,0.06)' }}
          >
            {t('malus_compare_btn')}
          </button>
        </div>
      )}

      {compareResults.length >= 2 && (
        <CompareResults
          results={compareResults}
          emission={emission}
          weight={weight}
          panelRef={panelRef}
        />
      )}
    </>
  )
}

function CountryCheckboxGrid({ selected, onToggle }) {
  const { t } = useSettings()
  return (
    <div className="glass-card p-4 mb-2">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-white">{t('malus_compare_select_countries')}</span>
        <span className="text-xs text-slate-500">{selected.length}/6</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
        {COUNTRIES.map(c => {
          const cfg = RELIABILITY_CONFIG[c.reliability]
          const isSelected = selected.some(x => x.code === c.code)
          return (
            <button
              key={c.code}
              onClick={() => onToggle(c)}
              aria-pressed={isSelected}
              className="py-2 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition active:scale-95"
              style={{
                border:     `1px solid ${isSelected ? 'rgba(80,229,229,0.55)' : 'rgba(255,255,255,0.07)'}`,
                background: isSelected ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="text-[10px] text-slate-400 leading-tight">{c.name}</span>
              <span className="text-[9px] font-bold" style={{ color: cfg.color }}>
                {t(cfg.shortKey)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompareResults({ results, emission, weight, panelRef }) {
  const { t } = useSettings()
  const sorted = [...results].sort((a, b) => (a.specific_penalty_amount || 0) - (b.specific_penalty_amount || 0))

  return (
    <div ref={panelRef} className="glass-card overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-white/7">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {t('malus_compare_results').replace('{e}', emission).replace('{w}', weight)}
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {sorted.map(r => <CompareResultRow key={r.country.code} result={r} />)}
      </div>
    </div>
  )
}

function CompareResultRow({ result }) {
  const { t } = useSettings()
  const cfg = RELIABILITY_CONFIG[result.reliability]
  const hasPenalty = (result.specific_penalty_amount || 0) > 0

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{result.country.flag}</span>
          <div>
            <div className="text-sm font-bold text-white">{result.country.localizedName || result.country.name}</div>
            <div className="text-[11px] text-slate-400 leading-snug">{result.tax_name}</div>
            <div className="text-[11px] font-semibold" style={{ color: cfg.color }}>{t(cfg.labelKey)}</div>
          </div>
        </div>
        <div
          className="rounded-lg px-3 py-1.5 text-center flex-shrink-0"
          style={{ background: `${sevColor(result.severity)}18`, border: `1px solid ${sevColor(result.severity)}33` }}
        >
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{t('co2_severity')}</div>
          <div className="text-xs font-semibold" style={{ color: sevColor(result.severity) }}>
            {t(`co2_severity_${result.severity}`)}
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: hasPenalty ? '#fb923c' : '#50E5E5' }}>
        {result.specific_penalty}
      </div>
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {result.source_url && (
          <a
            href={result.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] hover:opacity-90 transition"
            style={{ color: cfg.color }}
          >
            <span>↗</span>{result.source}
          </a>
        )}
        {result.legal_ref && <span className="text-[10px] text-slate-500">{result.legal_ref}</span>}
      </div>
    </div>
  )
}
