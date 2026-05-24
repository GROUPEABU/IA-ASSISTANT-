import { RELIABILITY_CONFIG, formatDateFR, getImportDecote } from '@/utils/malusWorld'
import { sevColor, sevLabel } from '../constants'

/**
 * Full result panel shown after selecting a country in the malus calculator.
 * Renders: header, key metrics, FR malus detail, brackets, exemptions, source.
 *
 * Read-only component — receives the computed result and inputs as props.
 */
export default function MalusResultPanel({
  result, dateImmat, isImported, emission, weight, fuelType, formatCurrency, panelRef,
}) {
  return (
    <div ref={panelRef} className="glass-card overflow-hidden animate-fade-in">
      <DateBanner dateImmat={dateImmat} isImported={isImported} />
      <CountryHeader result={result} />
      <KeyMetrics result={result} emission={emission} />
      {result.malus_co2 !== undefined && (
        <FranceMalusDetail
          result={result}
          emission={emission}
          weight={weight}
          fuelType={fuelType}
          formatCurrency={formatCurrency}
        />
      )}
      {result.brackets?.length > 0 && <CO2Brackets brackets={result.brackets} emission={emission} />}
      {result.weight_brackets?.length > 0 && <WeightBrackets brackets={result.weight_brackets} weight={weight} />}
      {result.exemptions?.length > 0 && <Exemptions items={result.exemptions} />}
      {result.notes && <Notes text={result.notes} />}
      {result.source_url && <SourceFooter result={result} />}
    </div>
  )
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function DateBanner({ dateImmat, isImported }) {
  return (
    <div className="bg-cyan-400/10 border-b border-cyan-400/25 px-4 py-2 text-[11px] text-cyan-400 text-center">
      📅 Calcul pour véhicule immatriculé le <strong>{formatDateFR(dateImmat)}</strong>
      {isImported && <span> · 🚗 Importé (décote {getImportDecote(dateImmat)}%)</span>}
    </div>
  )
}

function CountryHeader({ result }) {
  const cfg = RELIABILITY_CONFIG[result.reliability]
  return (
    <div className="p-5 border-b border-white/7">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{result.country.flag}</span>
        <div>
          <div className="text-xl font-bold text-white">{result.country.name}</div>
          <div className="text-[11px] text-slate-400 leading-snug">{result.tax_name}</div>
          <div className="text-[11px] mt-0.5" style={{ color: cfg.color }}>
            {cfg.label} ·{' '}
            {result.source_url
              ? (
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 opacity-80 hover:opacity-100"
                  style={{ color: cfg.color }}
                >{result.source}</a>
              )
              : result.source}
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-500 leading-relaxed mb-3">{result.system_description}</div>
      <div
        className="inline-block rounded-xl px-4 py-2"
        style={{ background: `${sevColor(result.severity)}18`, border: `1px solid ${sevColor(result.severity)}44` }}
      >
        <div className="text-[11px] text-slate-500 tracking-wider mb-0.5">SÉVÉRITÉ</div>
        <div className="text-sm font-medium" style={{ color: sevColor(result.severity) }}>
          {sevLabel(result.severity)}
        </div>
      </div>
    </div>
  )
}

function KeyMetrics({ result, emission }) {
  const metrics = [
    { label: 'Seuil CO₂',           value: result.threshold_gkm ? `${result.threshold_gkm} g/km` : '—' },
    { label: `Pour ${emission} g/km`, value: result.specific_penalty, highlight: true },
    { label: 'Maximum',             value: result.max_penalty_eur ? `${result.max_penalty_eur.toLocaleString()} ${result.currency_symbol}` : 'Variable' },
  ]
  return (
    <div className="grid grid-cols-3 divide-x divide-white/5">
      {metrics.map((m, i) => (
        <div
          key={i}
          className="px-4 py-3"
          style={{ background: m.highlight ? 'rgba(80,229,229,0.08)' : 'rgba(255,255,255,0.02)' }}
        >
          <div className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">{m.label}</div>
          <div className="text-sm font-semibold" style={{ color: m.highlight ? '#50E5E5' : '#E0E1E1' }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function FranceMalusDetail({ result, emission, weight, fuelType, formatCurrency }) {
  const isFR = result.country.code === 'FR'
  const phevReduction = isFR && fuelType === 'phev' ? Math.min(200, Math.round(weight * 0.15)) : 0

  return (
    <div className="p-5 border-t border-white/7 bg-sky-400/3">
      <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Détail du malus</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/7">
          <div className="text-[11px] text-slate-500 mb-1">MALUS CO₂ ({emission} g/km)</div>
          <div className="text-lg font-medium text-cyan-400">{formatCurrency(result.malus_co2)}</div>
          {fuelType === 'ev' && isFR && (
            <div className="text-[11px] text-sky-300 mt-1">✓ EV exempté</div>
          )}
        </div>

        <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/7">
          <div className="text-[11px] text-slate-500 mb-1">
            MALUS POIDS ({weight} kg
            {isFR && fuelType === 'hybride' && ' · −100'}
            {isFR && fuelType === 'phev'    && ` · −${phevReduction}`}
            {isFR && (fuelType === 'hybride' || fuelType === 'phev') && ' kg'}
            )
          </div>
          <div className="text-lg font-medium text-sky-300">{formatCurrency(result.malus_poids)}</div>
          {isFR && fuelType === 'phev' && (
            <div className="text-[11px] text-sky-200 mt-1">Masse retenue : {weight - phevReduction} kg</div>
          )}
          {isFR && fuelType === 'hybride' && (
            <div className="text-[11px] text-sky-200 mt-1">Masse retenue : {weight - 100} kg</div>
          )}
          {isFR && fuelType === 'ev' && (
            <div className="text-[11px] text-sky-300 mt-1">✓ EV exempté</div>
          )}
        </div>

        <div className="rounded-lg px-3 py-2.5 border border-cyan-400/30 bg-cyan-400/8">
          <div className="text-[11px] text-sky-200 mb-1">TOTAL À PAYER</div>
          <div className="text-lg font-semibold text-cyan-400">
            {formatCurrency(result.specific_penalty_amount)}
          </div>
        </div>
      </div>
    </div>
  )
}

function CO2Brackets({ brackets, emission }) {
  return (
    <div className="p-5 border-t border-white/7">
      <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Barème CO₂</div>
      <div className="flex flex-col gap-1.5">
        {brackets.map((b, i) => {
          const isActive = emission >= b.min_gkm && emission <= (b.max_gkm || 9999)
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
              style={{
                background:  isActive ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(80,229,229,0.4)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isActive ? '#50E5E5' : '#475569' }}
              />
              <span className="text-slate-400 w-28 flex-shrink-0">
                {b.min_gkm}–{b.max_gkm ? b.max_gkm : '∞'} g/km
              </span>
              <span className={isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>{b.label}</span>
              <span className="ml-auto text-[11px]" style={{ color: isActive ? '#50E5E5' : '#475569' }}>
                {b.penalty}
              </span>
              {isActive && (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full ml-1">◀</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeightBrackets({ brackets, weight }) {
  return (
    <div className="p-5 border-t border-white/7">
      <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Barème poids</div>
      <div className="flex flex-col gap-1.5">
        {brackets.map((b, i) => {
          const isActive = weight >= b.min_kg && weight <= (b.max_kg || 99999)
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
              style={{
                background:  isActive ? 'rgba(125,211,252,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(125,211,252,0.35)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isActive ? '#7DD3FC' : '#475569' }}
              />
              <span className="text-slate-400 w-32 flex-shrink-0">
                {b.min_kg}–{b.max_kg ? b.max_kg : '∞'} kg
              </span>
              <span className={isActive ? 'text-sky-300 font-semibold' : 'text-slate-400'}>{b.label}</span>
              <span className="ml-auto text-[11px]" style={{ color: isActive ? '#7DD3FC' : '#475569' }}>
                {b.penalty}
              </span>
              {isActive && (
                <span className="text-[10px] font-bold text-sky-300 bg-sky-300/10 px-2 py-0.5 rounded-full ml-1">◀</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Exemptions({ items }) {
  return (
    <div className="p-5 border-t border-white/7">
      <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Exemptions / réductions</div>
      <div className="flex flex-col gap-1.5">
        {items.map((ex, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>{ex}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Notes({ text }) {
  return (
    <div className="px-5 pt-4 pb-1 border-t border-white/7">
      <div className="text-[11px] text-slate-500 tracking-wider mb-2 uppercase">Calcul détaillé</div>
      <div className="text-[11px] text-slate-400 leading-relaxed">{text}</div>
    </div>
  )
}

function SourceFooter({ result }) {
  const cfg = RELIABILITY_CONFIG[result.reliability]
  return (
    <div className="px-5 py-4 border-t border-white/7 bg-white/[0.015] rounded-b-2xl">
      <div className="text-[11px] text-slate-500 tracking-wider mb-2 uppercase">Source officielle</div>
      <a
        href={result.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs font-medium hover:opacity-90 transition"
        style={{ color: cfg.color }}
      >
        <span>↗</span>
        <span>{result.source}</span>
      </a>
      <div className="text-[10px] text-slate-600 mt-0.5 font-mono truncate">{result.source_url}</div>
      {result.legal_ref && (
        <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/5">
          <span className="text-slate-500 mr-1">Réf. légale :</span>{result.legal_ref}
        </div>
      )}
    </div>
  )
}
