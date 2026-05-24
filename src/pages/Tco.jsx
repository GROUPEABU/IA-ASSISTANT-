import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getMalus } from '@/utils/malus'
import { formatNumber } from '@/utils/formatters'
import { useSettings } from '@/contexts/SettingsContext'

// ─── Maintenance defaults ───────────────────────────────────────────────────
const MAINT_TIERS = [
  { k: 'low',     l: 'Low-cost / Chinois', thermique: 800,  hybride: 900,  phev: 1000, ev: 600  },
  { k: 'mid',     l: 'Généraliste',        thermique: 1200, hybride: 1400, phev: 1500, ev: 800  },
  { k: 'premium', l: 'Premium',            thermique: 2000, hybride: 2200, phev: 2400, ev: 1400 },
]

const FUEL_LABELS = { thermique: 'Thermique', hybride: 'Hybride', phev: 'PHEV', ev: 'Électrique' }

const COLORS = ['#50E5E5', '#7DD3FC', '#a78bfa', '#fb923c']

const emptyVehicle = (id) => ({
  id,
  nom: '',
  prix: '',
  co2: '',
  fuelType: 'thermique',
  conso: '',       // L/100km (thermique/hybride) or kWh/100km (ev)
  maint: '',       // annual maintenance €, overrides tier default
  tier: 'mid',
  open: true,
})

function getMaintDefault(fuelType, tier) {
  const t = MAINT_TIERS.find(x => x.k === tier) || MAINT_TIERS[1]
  return t[fuelType] || t.thermique
}

function calcTco({ prix, co2, fuelType, conso, maint, years, kmYear, fuelPrice, elecPrice }) {
  const p = Number(prix) || 0
  const c = Number(co2) || 0
  const cons = Number(conso) || 0
  const malus = getMalus(c, p)

  let annualFuel = 0
  if (fuelType === 'ev') {
    annualFuel = (kmYear * cons / 100) * elecPrice
  } else if (fuelType === 'phev') {
    // assume ~50% electric for realistic PHEV
    annualFuel = (kmYear * cons / 100) * fuelPrice * 0.5 + (kmYear * 0.5 * 0.18) * elecPrice
  } else {
    annualFuel = (kmYear * cons / 100) * fuelPrice
  }

  const totalFuel = Math.round(annualFuel * years)
  const totalMaint = Number(maint) * years
  const total = p + malus + totalFuel + totalMaint
  return { malus, totalFuel, totalMaint, total }
}

function CustomTooltip({ active, payload, label }) {
  const { t } = useSettings()
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
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

export default function Tco() {
  const { t, formatCurrency } = useSettings()
  const [vehicles, setVehicles] = useState([emptyVehicle(1), emptyVehicle(2)])
  const [years, setYears] = useState(4)
  const [kmYear, setKmYear] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(1.85)
  const [elecPrice, setElecPrice] = useState(0.25)

  const nextId = () => Math.max(...vehicles.map(v => v.id)) + 1

  const update = (id, field, val) =>
    setVehicles(vs => vs.map(v => {
      if (v.id !== id) return v
      const updated = { ...v, [field]: val }
      // auto-set maintenance when tier or fuelType changes
      if ((field === 'tier' || field === 'fuelType') && !v.maintManual) {
        updated.maint = getMaintDefault(updated.fuelType, updated.tier)
      }
      return updated
    }))

  const addVehicle = () => {
    if (vehicles.length >= 4) return
    const id = nextId()
    setVehicles(vs => [...vs, { ...emptyVehicle(id), maint: getMaintDefault('thermique', 'mid') }])
  }

  const removeVehicle = (id) => setVehicles(vs => vs.filter(v => v.id !== id))

  const toggleOpen = (id) => setVehicles(vs => vs.map(v => v.id === id ? { ...v, open: !v.open } : v))

  // Init maint on first render
  const vehiclesWithMaint = vehicles.map(v => ({
    ...v,
    maint: v.maint !== '' ? v.maint : getMaintDefault(v.fuelType, v.tier),
  }))

  const results = useMemo(() => {
    return vehiclesWithMaint
      .filter(v => v.nom && Number(v.prix) > 0)
      .map((v, i) => {
        const { malus, totalFuel, totalMaint, total } = calcTco({
          prix: v.prix, co2: v.co2, fuelType: v.fuelType,
          conso: v.conso, maint: v.maint,
          years, kmYear, fuelPrice, elecPrice,
        })
        return { nom: v.nom, prix: Number(v.prix), malus, totalFuel, totalMaint, total, color: COLORS[i % COLORS.length] }
      })
      .sort((a, b) => a.total - b.total)
  }, [vehiclesWithMaint, years, kmYear, fuelPrice, elecPrice])

  const hasResults = results.length >= 1
  const bestTotal = hasResults ? results[0].total : 0

  return (
    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0 overflow-y-auto">
      <div className="flex-shrink-0">
        <h2 className="text-sm font-semibold text-white">{t('page_tco_title')}</h2>
        <p className="text-xs text-slate-500">{t('tco_description')}</p>
      </div>

      {/* Global config */}
      <div className="glass-card p-4">
        <div className="text-[11px] text-slate-500 font-medium tracking-widest uppercase mb-3">{t('params_label')}</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Duration */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5">{t('duration_label')}</div>
            <div className="flex gap-1">
              {[3, 4, 5].map(y => (
                <button key={y} onClick={() => setYears(y)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border transition"
                  style={{
                    borderColor: years === y ? '#50E5E5' : 'rgba(255,255,255,0.1)',
                    background: years === y ? 'rgba(80,229,229,0.12)' : 'transparent',
                    color: years === y ? '#50E5E5' : '#64748b',
                  }}
                >{y} {t('years_unit')}</button>
              ))}
            </div>
          </div>

          {/* Km/year */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5">{t('km_year')}</div>
            <div className="flex gap-1">
              {[10000, 15000, 20000, 30000].map(k => (
                <button key={k} onClick={() => setKmYear(k)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-semibold border transition"
                  style={{
                    borderColor: kmYear === k ? '#50E5E5' : 'rgba(255,255,255,0.1)',
                    background: kmYear === k ? 'rgba(80,229,229,0.12)' : 'transparent',
                    color: kmYear === k ? '#50E5E5' : '#64748b',
                  }}
                >{k >= 1000 ? `${k/1000}k` : k}</button>
              ))}
            </div>
          </div>

          {/* Fuel price */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5">{t('fuel_price_label')} ({t('fuel_price_unit')})</div>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.05" min="0.5" max="4" value={fuelPrice}
                onChange={e => setFuelPrice(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-cyan-400 font-semibold border border-cyan-400/20 bg-cyan-400/5 outline-none text-center"
                style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
              />
              <span className="text-xs text-slate-500">€/L</span>
            </div>
          </div>

          {/* Electric price */}
          <div>
            <div className="text-xs text-slate-400 mb-1.5">{t('elec_price_label')} ({t('elec_price_unit')})</div>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" min="0.05" max="1" value={elecPrice}
                onChange={e => setElecPrice(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-sky-300 font-semibold border border-sky-300/20 bg-sky-300/5 outline-none text-center"
                style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
              />
              <span className="text-xs text-slate-500">€/kWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle forms */}
      <div className="flex flex-col gap-2">
        {vehiclesWithMaint.map((v, idx) => (
          <div key={v.id} className="glass-card overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => toggleOpen(v.id)}
            >
              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-navy-900"
                style={{ background: COLORS[idx % COLORS.length] }}>
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium truncate" style={{ color: v.nom ? '#E0E1E1' : '#475569' }}>
                {v.nom || `Véhicule ${idx + 1}`}
              </span>
              {v.nom && Number(v.prix) > 0 && (
                <span className="text-xs text-slate-500">{formatNumber(Number(v.prix))} €</span>
              )}
              <div className="flex items-center gap-2">
                {vehicles.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeVehicle(v.id) }}
                    className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-400 transition rounded">
                    <Trash2 size={13} />
                  </button>
                )}
                {v.open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </div>
            </div>

            {v.open && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[11px] text-slate-500 uppercase tracking-wider">{t('vehicle_name_label')}</label>
                  <input
                    value={v.nom}
                    onChange={e => update(v.id, 'nom', e.target.value)}
                    placeholder={t('vehicle_name_ph')}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>

                {/* Price + CO2 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider">{t('price_label')} (€)</label>
                    <input
                      type="number" value={v.prix}
                      onChange={e => update(v.id, 'prix', e.target.value)}
                      placeholder="28 900"
                      className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
                      style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider">{t('co2_input_label')}</label>
                    <input
                      type="number" value={v.co2}
                      onChange={e => update(v.id, 'co2', e.target.value)}
                      placeholder="120"
                      className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
                      style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
                    />
                  </div>
                </div>

                {/* Fuel type */}
                <div>
                  <label className="text-[11px] text-slate-500 uppercase tracking-wider">{t('powertrain_label')}</label>
                  <div className="grid grid-cols-4 gap-0 bg-navy-900/50 rounded-xl p-1 mt-1">
                    {Object.entries(FUEL_LABELS).map(([k, l]) => (
                      <button key={k} onClick={() => update(v.id, 'fuelType', k)}
                        className="py-2 rounded-[9px] text-[11px] font-semibold transition"
                        style={{
                          background: v.fuelType === k ? 'rgba(80,229,229,0.16)' : 'transparent',
                          color: v.fuelType === k ? '#50E5E5' : '#64748b',
                        }}
                      >{l}</button>
                    ))}
                  </div>
                </div>

                {/* Consumption */}
                <div>
                  <label className="text-[11px] text-slate-500 uppercase tracking-wider">
                    {t('consumption_label')} ({v.fuelType === 'ev' ? 'kWh/100km' : 'L/100km'})
                  </label>
                  <input
                    type="number" step="0.1" value={v.conso}
                    onChange={e => update(v.id, 'conso', e.target.value)}
                    placeholder={v.fuelType === 'ev' ? '17' : v.fuelType === 'phev' ? '2.4' : v.fuelType === 'hybride' ? '5.3' : '7.0'}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
                    style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
                  />
                </div>

                {/* Maintenance tier + override */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider">{t('maintenance_label')}</label>
                    <span className="text-[10px] text-slate-600">modifiable</span>
                  </div>
                  {/* Tier selector */}
                  <div className="grid grid-cols-3 gap-0 bg-navy-900/50 rounded-xl p-1 mb-2">
                    {MAINT_TIERS.map(tier => (
                      <button key={tier.k} onClick={() => {
                        update(v.id, 'tier', tier.k)
                        update(v.id, 'maint', getMaintDefault(v.fuelType, tier.k))
                        update(v.id, 'maintManual', false)
                      }}
                        className="py-1.5 rounded-[9px] text-[10px] font-semibold transition leading-tight"
                        style={{
                          background: v.tier === tier.k ? 'rgba(80,229,229,0.16)' : 'transparent',
                          color: v.tier === tier.k ? '#50E5E5' : '#64748b',
                        }}
                      >{tier.l}</button>
                    ))}
                  </div>
                  {/* Manual override */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="100" value={v.maint}
                      onChange={e => {
                        update(v.id, 'maint', e.target.value)
                        update(v.id, 'maintManual', true)
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-amber-400 font-semibold border border-amber-400/20 bg-amber-400/5 outline-none text-center"
                      style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
                    />
                    <span className="text-xs text-slate-500">€/an</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Entretien + réparations estimés · ajustez selon votre expérience</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {vehicles.length < 4 && (
          <button onClick={addVehicle}
            className="glass-card px-4 py-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-cyan-400 border-dashed transition w-full"
            style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <Plus size={15} />
            {t('add_vehicle')}
          </button>
        )}
      </div>

      {/* Results */}
      {hasResults && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-white/7">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              TCO sur {years} ans · {(kmYear/1000).toFixed(0)}k km/an
            </div>
          </div>

          {/* Bar chart */}
          <div className="px-2 pt-4 pb-2" style={{ height: 200 + results.length * 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nom" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="prix" name="Prix" stackId="a" fill="#334155" radius={[0,0,0,0]}>
                  {results.map((r, i) => <Cell key={i} fill={i === 0 ? `${r.color}cc` : '#334155'} />)}
                </Bar>
                <Bar dataKey="malus" name="Malus" stackId="a" fill="#f87171" />
                <Bar dataKey="totalFuel" name="Carburant" stackId="a" fill="#fbbf24" />
                <Bar dataKey="totalMaint" name="Entretien" stackId="a" fill="#64748b" radius={[0,4,4,0]}>
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

          {/* Savings callout */}
          {results.length >= 2 && results[0].total < results[results.length - 1].total && (
            <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
              <div className="text-xs font-semibold text-emerald-400">
                💰 {results[0].nom} — économie de {formatCurrency(Math.round(results[results.length - 1].total - results[0].total))} vs {results[results.length - 1].nom}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sur {years} ans · {(kmYear/1000).toFixed(0)} 000 km/an</div>
            </div>
          )}

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-white/7">
                  <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider">{t('tco_row_label')}</th>
                  {results.map((r, i) => (
                    <th key={i} className="px-3 py-2.5 text-right text-[11px] font-semibold" style={{ color: r.color }}>
                      {r.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { label: t('purchase_price'),                        key: 'prix' },
                  { label: t('co2_malus_row'),                         key: 'malus' },
                  { label: `${t('fuel_cost_row')} (${years} ${t('years_unit')})`, key: 'totalFuel' },
                  { label: `${t('maint_cost_row')} (${years} ${t('years_unit')})`, key: 'totalMaint' },
                ].map(row => (
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
                  <td className="px-4 py-3 text-white font-bold uppercase text-[11px] tracking-wider">{t('total_tco')}</td>
                  {results.map((r, i) => (
                    <td key={i} className="px-3 py-3 text-right font-bold text-base" style={{ color: i === 0 ? r.color : '#E0E1E1' }}>
                      {formatCurrency(Math.round(r.total))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-white/7 text-[11px] text-slate-600">
            {t('tco_note')}
          </div>
        </div>
      )}

      {!hasResults && (
        <div className="glass-card p-8 text-center text-slate-500 text-sm">
          {t('tco_empty')}
        </div>
      )}
    </div>
  )
}
