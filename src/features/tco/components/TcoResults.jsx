import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { useSettings } from '@/contexts/SettingsContext'
import { formatNumber } from '@/utils/formatters'

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

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-white/7">
        <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          TCO sur {years} {t('years_unit')} · {(kmYear / 1000).toFixed(0)}k km/an
        </div>
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

function ResultsChart({ results, formatCurrency }) {
  return (
    <div className="px-2 pt-4 pb-2" style={{ height: 200 + results.length * 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={results} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="nom" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="prix" name="Prix" stackId="a" fill="#334155" radius={[0, 0, 0, 0]}>
            {results.map((r, i) => <Cell key={i} fill={i === 0 ? `${r.color}cc` : '#334155'} />)}
          </Bar>
          <Bar dataKey="malus"      name="Malus"     stackId="a" fill="#f87171" />
          <Bar dataKey="totalFuel"  name="Carburant" stackId="a" fill="#fbbf24" />
          <Bar dataKey="totalMaint" name="Entretien" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="total"
              position="right"
              formatter={v => formatCurrency(Math.round(v))}
              style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  const { t } = useSettings()
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)
  return (
    <div className="bg-navy-800 border border-navy-700/50 rounded-xl p-3 text-xs space-y-1 shadow-lg">
      <p className="font-bold text-white mb-2 truncate max-w-[180px]">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-white font-semibold">{formatNumber(Math.round(p.value))} €</span>
        </div>
      ))}
      <div className="flex justify-between gap-6 border-t border-navy-700/50 pt-1 mt-1">
        <span className="font-bold text-slate-300">{t('total_tco')}</span>
        <span className="font-bold text-cyan-400">{formatNumber(Math.round(total))} €</span>
      </div>
    </div>
  )
}

function SavingsCallout({ best, worst, years, kmYear, formatCurrency }) {
  const savings = Math.round(worst.total - best.total)
  return (
    <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
      <div className="text-xs font-semibold text-emerald-400">
        💰 {best.nom} — économie de {formatCurrency(savings)} vs {worst.nom}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">
        Sur {years} ans · {(kmYear / 1000).toFixed(0)} 000 km/an
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
                className="px-3 py-3 text-right font-bold text-base"
                style={{ color: i === 0 ? r.color : '#E0E1E1' }}
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
