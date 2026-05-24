import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Calculator, TrendingDown, Fuel, Wrench } from 'lucide-react'
import { getMalus } from '@/utils/malus'
import { formatNumber } from '@/utils/formatters'
import { PRODUCTS } from '@/services/products'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseConso(str) {
  if (typeof str === 'number') return str
  const match = String(str).replace(',', '.').match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 7.0
}

function isPhev(product) {
  if (!product) return false
  return product.model.includes('PHEV') || product.segment.includes('Plug-in')
}

function calcVehicle({ nom, prix, co2, conso, years, kmYear, fuelPrice, electricPct, phev, maintenancePerYear }) {
  const malus = getMalus(co2, prix)
  const thermalConso = phev ? conso * (1 - electricPct) : conso
  const electricConsoEur = phev ? kmYear * electricPct * 0.036 : 0 // 3.6€/100km electric
  const annualFuel = (kmYear * thermalConso / 100 * fuelPrice) + electricConsoEur
  const totalFuel = Math.round(annualFuel * years)
  const totalMaint = maintenancePerYear * years
  const total = prix + malus + totalFuel + totalMaint
  return { nom, prix, malus, totalFuel, totalMaint, total }
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-navy-800 border border-navy-700/50 rounded-xl p-3 text-xs space-y-1 shadow-cyan-lg z-50">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-semibold">{formatNumber(Math.round(p.value))} €</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-navy-700 pt-1 mt-1">
        <span className="text-cyan-400 font-bold">TOTAL</span>
        <span className="text-cyan-400 font-bold">{formatNumber(Math.round(total))} €</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chip button helper
// ---------------------------------------------------------------------------

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95
        ${active
          ? 'bg-cyan-400 text-navy-900 border-cyan-400'
          : 'bg-navy-900/60 border-navy-700/50 text-slate-400 hover:border-cyan-400/40 hover:text-slate-200'
        }`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const KM_OPTIONS = [10000, 15000, 20000, 30000]
const YEAR_OPTIONS = [3, 4, 5]
const ELECTRIC_PCT_OPTIONS = [0, 0.3, 0.5, 0.7]

// Stack colours
const COLOR_PRIX = '#1e3a52'
const COLOR_MALUS = '#f87171'
const COLOR_FUEL = '#fb923c'
const COLOR_MAINT = '#475569'
const COLOR_JAECOO = '#50E5E5'
const COLOR_COMPETITOR = '#64748b'

export default function Tco() {
  const [vehicleId, setVehicleId] = useState(PRODUCTS[0]?.id || '')
  const [kmYear, setKmYear] = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(1.85)
  const [years, setYears] = useState(4)
  const [electricPct, setElectricPct] = useState(0.5)

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const selectedProduct = useMemo(
    () => PRODUCTS.find((p) => p.id === vehicleId),
    [vehicleId]
  )

  const phev = useMemo(() => isPhev(selectedProduct), [selectedProduct])

  const maintenancePerYear = phev ? 950 : 800

  const chartData = useMemo(() => {
    if (!selectedProduct) return []

    const ownConso = parseConso(selectedProduct.specs.consommation)
    const ownEntry = calcVehicle({
      nom: selectedProduct.fullName,
      prix: selectedProduct.prix.base,
      co2: selectedProduct.specs.co2_wltp,
      conso: ownConso,
      years,
      kmYear,
      fuelPrice,
      electricPct,
      phev,
      maintenancePerYear,
    })

    const competitorEntries = (selectedProduct.concurrents || []).map((c) => {
      const conso = typeof c.conso === 'number' ? c.conso : parseConso(c.conso || 7)
      return calcVehicle({
        nom: c.nom,
        prix: c.prix,
        co2: c.co2,
        conso,
        years,
        kmYear,
        fuelPrice,
        electricPct,
        phev: false, // competitors are not PHEV in the data
        maintenancePerYear: 800,
      })
    })

    // JAECOO first, then sort competitors by total ascending
    const sorted = [...competitorEntries].sort((a, b) => a.total - b.total)
    return [{ ...ownEntry, isOwn: true }, ...sorted.map((e) => ({ ...e, isOwn: false }))]
  }, [selectedProduct, years, kmYear, fuelPrice, electricPct, phev, maintenancePerYear])

  // Savings vs most expensive
  const savings = useMemo(() => {
    if (!chartData.length) return null
    const ownTotal = chartData[0]?.total
    const maxTotal = Math.max(...chartData.map((d) => d.total))
    const diff = maxTotal - ownTotal
    return diff > 0 ? diff : null
  }, [chartData])

  // Chart height responsive
  const chartHeight = Math.max(200, Math.min(320, chartData.length * 52))

  // Format short name for Y-axis (truncate long names)
  const shortName = (name) => {
    if (name.length <= 20) return name
    return name.slice(0, 18) + '…'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <Calculator size={16} className="text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">TCO — Coût Total de Possession</h2>
        <span className="text-xs text-slate-500">Carburant · Malus · Entretien</span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Config panel                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="glass-card p-4 md:p-5 space-y-4">
        {/* Row 1 — Vehicle chips */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Véhicule JAECOO
          </p>
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map((p) => (
              <Chip
                key={p.id}
                active={vehicleId === p.id}
                onClick={() => setVehicleId(p.id)}
              >
                {p.fullName}
              </Chip>
            ))}
          </div>
        </div>

        {/* Row 2 — km/year + fuel price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Kilométrage annuel
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {KM_OPTIONS.map((km) => (
                <Chip key={km} active={kmYear === km} onClick={() => setKmYear(km)}>
                  {formatNumber(km)} km
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Prix du carburant
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-[160px]">
                <input
                  type="number"
                  min="1"
                  max="3"
                  step="0.01"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 1.85)}
                  className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2
                             text-sm text-white focus:outline-none focus:border-cyan-400/60
                             focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>
              <span className="text-xs text-slate-400">€ / litre</span>
            </div>
          </div>
        </div>

        {/* Row 3 — Duration */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Durée de possession
          </p>
          <div className="flex gap-2">
            {YEAR_OPTIONS.map((y) => (
              <Chip key={y} active={years === y} onClick={() => setYears(y)}>
                {y} ans
              </Chip>
            ))}
          </div>
        </div>

        {/* Row 4 — PHEV electric share (only when PHEV selected) */}
        {phev && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Part électrique (usage quotidien)
            </p>
            <div className="flex flex-wrap gap-2">
              {ELECTRIC_PCT_OPTIONS.map((pct) => (
                <Chip
                  key={pct}
                  active={electricPct === pct}
                  onClick={() => setElectricPct(pct)}
                >
                  {Math.round(pct * 100)} %
                </Chip>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              Proportion des km parcourus en mode 100 % électrique (recharge régulière à domicile)
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                              */}
      {/* ------------------------------------------------------------------ */}
      {selectedProduct && chartData.length > 0 && (
        <div className="glass-card p-4 md:p-5 space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-white">
              TCO sur{' '}
              <span className="text-cyan-400">{years} ans</span>
              {' '}—{' '}
              <span className="text-cyan-400">{formatNumber(kmYear)} km/an</span>
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PRIX }} />
                Prix achat
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_MALUS }} />
                Malus
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_FUEL }} />
                Carburant
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_MAINT }} />
                Entretien
              </span>
            </div>
          </div>

          {/* Stacked bar chart */}
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                barSize={22}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${formatNumber(Math.round(v / 1000))}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nom"
                  width={130}
                  tick={({ x, y, payload, index }) => {
                    const item = chartData[index]
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={4}
                        textAnchor="end"
                        fontSize={10}
                        fill={item?.isOwn ? '#50E5E5' : '#94a3b8'}
                        fontWeight={item?.isOwn ? '700' : '400'}
                      >
                        {shortName(payload.value)}
                      </text>
                    )
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="prix" name="Prix achat" stackId="a" fill={COLOR_PRIX} radius={[0, 0, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`prix-${index}`}
                      fill={entry.isOwn ? '#1e4a6a' : COLOR_PRIX}
                    />
                  ))}
                </Bar>
                <Bar dataKey="malus" name="Malus" stackId="a" fill={COLOR_MALUS}>
                  {chartData.map((entry, index) => (
                    <Cell key={`malus-${index}`} fill={COLOR_MALUS} />
                  ))}
                </Bar>
                <Bar dataKey="totalFuel" name="Carburant" stackId="a" fill={COLOR_FUEL}>
                  {chartData.map((entry, index) => (
                    <Cell key={`fuel-${index}`} fill={COLOR_FUEL} />
                  ))}
                </Bar>
                <Bar dataKey="totalMaint" name="Entretien" stackId="a" fill={COLOR_MAINT} radius={[0, 3, 3, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`maint-${index}`} fill={COLOR_MAINT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings callout */}
          {savings && savings > 500 && (
            <div className="flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/25 rounded-xl px-4 py-3">
              <TrendingDown size={16} className="text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-cyan-400">
                  Économie vs le plus cher : –{formatNumber(Math.round(savings))} €
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  sur {years} ans à {formatNumber(kmYear)} km/an
                </p>
              </div>
            </div>
          )}

          {/* Detail table */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-navy-700/50">
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Malus
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center justify-end gap-1">
                      <Fuel size={10} />
                      Carburant
                    </span>
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center justify-end gap-1">
                      <Wrench size={10} />
                      Entretien
                    </span>
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-navy-700/20 last:border-0 transition-colors
                      ${row.isOwn
                        ? 'bg-cyan-400/10 hover:bg-cyan-400/15'
                        : 'hover:bg-navy-700/20'
                      }`}
                  >
                    <td className={`py-2.5 px-2 font-semibold ${row.isOwn ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {row.nom}
                      {row.isOwn && (
                        <span className="ml-1.5 text-[9px] bg-cyan-400/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          JAECOO
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-2 text-right tabular-nums ${row.isOwn ? 'text-slate-300 font-semibold' : 'text-slate-400'}`}>
                      {formatNumber(row.prix)} €
                    </td>
                    <td className={`py-2.5 px-2 text-right tabular-nums ${row.malus > 0 ? 'text-red-400' : 'text-emerald-400'} font-semibold`}>
                      {row.malus > 0 ? `+${formatNumber(row.malus)} €` : '—'}
                    </td>
                    <td className={`py-2.5 px-2 text-right tabular-nums ${row.isOwn ? 'text-slate-300 font-semibold' : 'text-slate-400'}`}>
                      {formatNumber(row.totalFuel)} €
                    </td>
                    <td className={`py-2.5 px-2 text-right tabular-nums ${row.isOwn ? 'text-slate-300 font-semibold' : 'text-slate-400'}`}>
                      {formatNumber(row.totalMaint)} €
                    </td>
                    <td className={`py-2.5 px-2 text-right tabular-nums font-bold ${row.isOwn ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {formatNumber(row.total)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-slate-600 leading-relaxed">
            * Entretien estimé {formatNumber(maintenancePerYear)} €/an
            {phev && ' · PHEV : consommation WLTP (charge régulière supposée)'}
            {' '}· Malus France 2025 (barème WLTP) · Carburant SP95-E10 à {fuelPrice.toFixed(2)} €/L
            {phev && ` · Électricité estimée 3,6 €/100 km (${Math.round(electricPct * 100)} % des km en électrique)`}
          </p>
        </div>
      )}
    </div>
  )
}
