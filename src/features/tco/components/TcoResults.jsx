import { useSettings } from '@/contexts/SettingsContext'
import { formatNumber } from '@/utils/formatters'
import { FileText } from 'lucide-react'

/**
 * TCO results panel — bar chart + savings callout + detail table.
 *
 * @param {object} props
 * @param {Array}  props.results  — sorted result rows (best first)
 * @param {number} props.years    — duration in years
 * @param {number} props.kmYear   — annual mileage
 */
export default function TcoResults({ results, years, kmYear }) {
  const { t, formatCurrency } = useSettings()
  const bestResult = results[0]
  const worstResult = results[results.length - 1]
  const hasSavings = results.length >= 2 && bestResult.total < worstResult.total

  const handleCsv = () => {
    const header = ['Véhicule', 'Prix achat (€)', 'Malus (€)', `Carburant ${years}ans (€)`, `Entretien ${years}ans (€)`, 'TCO Total (€)']
    const rows = results.map(r => [r.nom, Math.round(r.prix), Math.round(r.malus), Math.round(r.totalFuel), Math.round(r.totalMaint), Math.round(r.total)])
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ABU TCO - ${new Date().toLocaleDateString('fr-FR').replace(/\//g, '.')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
        <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          {t('tco_on_years').replace('{n}', years)} · {(kmYear / 1000).toFixed(0)}k {t('tco_km_year')}
        </div>
        <button
          onClick={handleCsv}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 transition"
        >
          <FileText size={11} /> {t('csv_export')}
        </button>
      </div>

      <ResultsChart results={results} formatCurrency={formatCurrency} />

      {hasSavings && (
        <SavingsCallout
          best={bestResult}
          worst={worstResult}
          years={years}
          kmYear={kmYear}
          formatCurrency={formatCurrency}
        />
      )}

      <DetailTable results={results} years={years} formatCurrency={formatCurrency} t={t} />

      <div className="px-4 py-3 border-t border-white/7 text-[11px] text-slate-600">
        {t('tco_note')}
      </div>
    </div>
  )
}

/**
 * Lightweight horizontal stacked-bar chart (pure CSS — no charting lib).
 * Each row = one vehicle; segments are proportional to the largest total so
 * bars stay comparable. Hovering a segment shows its breakdown via title.
 */
function ResultsChart({ results, formatCurrency }) {
  const { t } = useSettings()
  const maxTotal = Math.max(...results.map(r => r.total), 1)
  const segments = [
    { key: 'prix',       label: t('tco_bar_price') },
    { key: 'malus',      label: 'Malus',            color: '#f87171' },
    { key: 'totalFuel',  label: t('tco_bar_fuel'),  color: '#E6B450' },
    { key: 'totalMaint', label: t('tco_bar_maint'), color: '#64748b' },
  ]

  const ariaLabel = results
    .map(r => `${r.nom}: ${formatNumber(Math.round(r.total))} €`)
    .join(', ')

  return (
    <div className="px-4 pt-4 pb-2" role="img" aria-label={`${t('total_tco')} — ${ariaLabel}`}>
      <div className="flex flex-col gap-3">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 w-24 sm:w-28 flex-shrink-0 truncate text-right" title={r.nom}>
              {r.nom}
            </span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 flex h-6 rounded-md overflow-hidden bg-white/[0.03] min-w-0">
                {segments.map(seg => {
                  const val = r[seg.key] || 0
                  if (val <= 0) return null
                  const pct = (val / maxTotal) * 100
                  // "prix" segment uses the vehicle colour for the best option, slate otherwise
                  const color = seg.key === 'prix' ? (i === 0 ? `${r.color}cc` : '#334155') : seg.color
                  return (
                    <div
                      key={seg.key}
                      style={{ width: `${pct}%`, background: color }}
                      title={`${seg.label} : ${formatNumber(Math.round(val))} €`}
                    />
                  )
                })}
              </div>
              <span
                className="text-[11px] font-semibold w-16 flex-shrink-0 text-right"
                style={{ color: i === 0 ? r.color : '#94a3b8' }}
              >
                {formatCurrency(Math.round(r.total))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-4 pt-3 border-t border-white/5">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: seg.key === 'prix' ? '#334155' : seg.color }}
            />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function SavingsCallout({ best, worst, years, kmYear, formatCurrency }) {
  const { t } = useSettings()
  const savings = Math.round(worst.total - best.total)
  return (
    <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
      <div className="text-xs font-semibold text-emerald-400">
        {`💰 ${best.nom} — ${t('tco_savings_label').replace('{amount}', formatCurrency(savings)).replace('{other}', worst.nom)}`}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">
        {`${t('tco_over_years').replace('{n}', years)} · ${(kmYear / 1000).toFixed(0)} 000 ${t('tco_km_year')}`}
      </div>
    </div>
  )
}

function DetailTable({ results, years, formatCurrency, t }) {
  const rows = [
    { label: t('purchase_price'),                                          key: 'prix' },
    { label: t('co2_malus_row'),                                           key: 'malus' },
    { label: `${t('fuel_cost_row')} (${years} ${t('years_unit')})`,        key: 'totalFuel' },
    { label: `${t('maint_cost_row')} (${years} ${t('years_unit')})`,       key: 'totalMaint' },
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-t border-white/7">
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              {t('tco_row_label')}
            </th>
            {results.map((r, i) => (
              <th key={i} className="px-3 py-2.5 text-right text-[11px] font-semibold" style={{ color: r.color }}>
                {r.nom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(row => (
            <tr key={row.key}>
              <td className="px-4 py-2.5 text-slate-400">{row.label}</td>
              {results.map((r, i) => (
                <td key={i} className="px-3 py-2.5 text-right text-slate-300 font-medium">
                  {formatCurrency(Math.round(r[row.key]))}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-white/3">
            <td className="px-4 py-3 text-white font-bold uppercase text-[11px] tracking-wider">
              {t('total_tco')}
            </td>
            {results.map((r, i) => (
              <td
                key={i}
                className={`px-3 py-3 text-right font-bold text-base ${i !== 0 ? 'text-slate-300' : ''}`}
                style={{ color: i === 0 ? r.color : undefined }}
              >
                {formatCurrency(Math.round(r.total))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
