import { useState, useEffect, useCallback, useRef } from 'react'
import {
  buildCountryData, COUNTRIES, CUSTOM_EMISSIONS, RELIABILITY_CONFIG,
  formatDateFR, getImportDecote, getImportDecoteNL, getImportDecotePT,
  getImportDecoteDE, getImportDecoteES, getImportDecoteBE, getImportDecoteIE,
} from '@/utils/malusWorld'

const SEVERITY_COLOR = { none: '#50E5E5', low: '#A5F3FC', medium: '#facc15', high: '#fb923c', very_high: '#f87171' }
const SEVERITY_LABEL = { none: 'Aucun', low: 'Faible', medium: 'Modéré', high: 'Élevé', very_high: 'Très élevé' }
const sevColor = s => SEVERITY_COLOR[s] || '#94a3b8'
const sevLabel = s => SEVERITY_LABEL[s] || '—'

const WEIGHT_PRESETS = [1200, 1450, 1600, 1800, 1950, 2200, 2500, 2800]
const DATE_PRESETS = [
  { d: '2023-06-15', l: '2023' }, { d: '2024-06-15', l: '2024' },
  { d: '2025-02-15', l: 'Fév 25' }, { d: '2025-03-12', l: 'Mars 25' },
  { d: '2025-10-01', l: 'Oct 25' }, { d: '2026-01-15', l: 'Janv 26' },
  { d: '2026-07-01', l: 'Juil 26' }, { d: '2026-09-15', l: 'Sept 26' },
]

function SliderSection({ label, value, setValue, min, max, step = 1, unit, color, presets }) {
  return (
    <div className="glass-card p-3 mb-2">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setValue(v => Math.max(min, v - step))}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: `${color}30`, background: `${color}08`, color }}
          >−</button>
          <div className="flex items-baseline gap-1">
            <input
              type="number" min={min} max={max} value={value} inputMode="numeric"
              onChange={e => { const v = e.target.value === '' ? min : Number(e.target.value); if (!isNaN(v)) setValue(Math.min(max, Math.max(min, v))) }}
              className="w-16 text-2xl font-bold text-right bg-transparent border-0 outline-none"
              style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color }}
            />
            <span className="text-xs font-medium" style={{ color, opacity: 0.65 }}>{unit}</span>
          </div>
          <button
            onClick={() => setValue(v => Math.min(max, v + step))}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
            style={{ borderColor: `${color}30`, background: `${color}08`, color }}
          >+</button>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-full block mb-2.5" style={{ accentColor: color, height: 3 }}
      />
      <div className="grid grid-cols-4 gap-1">
        {presets.map(v => (
          <button key={v} onClick={() => setValue(v)}
            className="py-1.5 rounded-lg text-[11px] font-medium transition border active:scale-95"
            style={{
              borderColor: value === v ? color : 'rgba(255,255,255,0.08)',
              background: value === v ? `${color}18` : 'transparent',
              color: value === v ? color : '#475569',
            }}
          >{v}</button>
        ))}
      </div>
    </div>
  )
}

function SegButton({ options, value, setValue, cols = 2 }) {
  return (
    <div className="grid gap-0 bg-navy-900/50 rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(o => (
        <button key={o.k} onClick={() => setValue(o.k)}
          className="py-2 rounded-[9px] text-xs font-medium transition flex flex-col items-center gap-0.5 active:scale-95"
          style={{
            background: value === o.k ? 'rgba(80,229,229,0.16)' : 'transparent',
            color: value === o.k ? '#50E5E5' : '#64748b',
          }}
        >
          <span className="font-semibold">{o.l}</span>
          {o.note && <span className="text-[10px] opacity-60">{o.note}</span>}
        </button>
      ))}
    </div>
  )
}

export default function CO2Malus() {
  const [emission, setEmission] = useState(143)
  const [weight, setWeight] = useState(1450)
  const [fuelType, setFuelType] = useState('thermique')
  const [dateImmat, setDateImmat] = useState('2025-03-12')
  const [isImported, setIsImported] = useState(false)
  const [displacement, setDisplacement] = useState(1300)
  const [vehiclePrice, setVehiclePrice] = useState(30000)
  const [fuelKind, setFuelKind] = useState('petrol')
  const [beRegion, setBeRegion] = useState('wallonie')
  const [esRegion, setEsRegion] = useState('standard')
  const [childrenCount, setChildrenCount] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('country')
  const [compareResults, setCompareResults] = useState([])
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [reliabilityFilter, setReliabilityFilter] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState(null)

  const resultRef = useRef(null)
  const compareResultRef = useRef(null)

  const extra = { displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount }

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    (reliabilityFilter === 'all' || c.reliability === reliabilityFilter)
  )

  const handleCountry = useCallback((country) => {
    setSelectedCountry(country)
    const data = buildCountryData(country.code, emission, weight, fuelType, dateImmat, isImported, extra)
    setResult(data ? { ...data, country } : null)
  }, [emission, weight, fuelType, dateImmat, isImported, displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount])

  useEffect(() => {
    if (selectedCountry) {
      const data = buildCountryData(selectedCountry.code, emission, weight, fuelType, dateImmat, isImported, extra)
      setResult(data ? { ...data, country: selectedCountry } : null)
    }
  }, [emission, weight, fuelType, dateImmat, isImported, selectedCountry, displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount])

  useEffect(() => {
    if (selectedForCompare.length >= 2) {
      setCompareResults(selectedForCompare.map(c => {
        const d = buildCountryData(c.code, emission, weight, fuelType, dateImmat, isImported, extra)
        return d ? { ...d, country: c } : null
      }).filter(Boolean))
    }
  }, [emission, weight, fuelType, dateImmat, isImported, selectedForCompare, displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount])

  useEffect(() => {
    if (result) {
      setTimeout(() => {
        const el = resultRef.current
        if (!el) return
        const scroller = document.querySelector('main') || window
        const top = el.getBoundingClientRect().top + (scroller === window ? window.scrollY : scroller.scrollTop) - 16
        if (scroller === window) window.scrollTo({ top, behavior: 'smooth' })
        else scroller.scrollTo({ top, behavior: 'smooth' })
      }, 60)
    }
  }, [result])

  useEffect(() => {
    if (compareResults.length >= 2) {
      setTimeout(() => {
        const el = compareResultRef.current
        if (!el) return
        const scroller = document.querySelector('main') || window
        const top = el.getBoundingClientRect().top + (scroller === window ? window.scrollY : scroller.scrollTop) - 16
        if (scroller === window) window.scrollTo({ top, behavior: 'smooth' })
        else scroller.scrollTo({ top, behavior: 'smooth' })
      }, 60)
    }
  }, [compareResults])

  const toggleCompare = (c) => {
    setSelectedForCompare(prev =>
      prev.find(x => x.code === c.code)
        ? prev.filter(x => x.code !== c.code)
        : prev.length < 6 ? [...prev, c] : prev
    )
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className="text-sm font-semibold text-white">CO₂ & Malus Mondial</h2>
        <p className="text-xs text-slate-500">Calculateur sur 40 pays · Autobuyunion</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Estimation indicative · Consultez les autorités fiscales avant tout achat</p>
      </div>

      {/* Legend */}
      <div className="glass-card px-3 py-2.5 flex-shrink-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          {Object.entries(RELIABILITY_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.color, boxShadow: `0 0 5px ${v.color}88` }} />
              <span className="font-semibold" style={{ color: v.color }}>{v.label}</span>
              <span className="text-slate-600">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CO2 Slider */}
      <SliderSection
        label="Émissions CO₂" value={emission} setValue={setEmission}
        min={0} max={400} unit="g/km" color="#50E5E5"
        presets={CUSTOM_EMISSIONS}
      />

      {/* Weight Slider */}
      <div className="glass-card p-3 mb-2">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">Masse</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeight(v => Math.max(800, v - 10))}
              className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
              style={{ borderColor: 'rgba(125,211,252,0.25)', background: 'rgba(125,211,252,0.06)', color: '#7DD3FC' }}>−</button>
            <div className="flex items-baseline gap-1">
              <input type="number" min={800} max={3500} step={10} value={weight} inputMode="numeric"
                onChange={e => { const v = e.target.value === '' ? 800 : Number(e.target.value); if (!isNaN(v)) setWeight(Math.min(3500, Math.max(800, v))) }}
                className="w-16 text-2xl font-bold text-right bg-transparent border-0 outline-none"
                style={{ fontFamily: 'inherit', MozAppearance: 'textfield', WebkitAppearance: 'none', color: '#7DD3FC' }}
              />
              <span className="text-xs font-medium" style={{ color: '#7DD3FC', opacity: 0.65 }}>kg</span>
            </div>
            <button onClick={() => setWeight(v => Math.min(3500, v + 10))}
              className="w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 text-lg leading-none"
              style={{ borderColor: 'rgba(125,211,252,0.25)', background: 'rgba(125,211,252,0.06)', color: '#7DD3FC' }}>+</button>
          </div>
        </div>
        <input type="range" min={800} max={3000} step={10} value={weight}
          onChange={e => setWeight(Number(e.target.value))}
          className="w-full block mb-2.5" style={{ accentColor: '#7DD3FC', height: 3 }}
        />
        <div className="grid grid-cols-4 gap-1">
          {WEIGHT_PRESETS.map(v => (
            <button key={v} onClick={() => setWeight(v)}
              className="py-1.5 rounded-lg text-[11px] font-medium transition border active:scale-95"
              style={{
                borderColor: weight === v ? '#7DD3FC' : 'rgba(255,255,255,0.08)',
                background: weight === v ? 'rgba(125,211,252,0.12)' : 'transparent',
                color: weight === v ? '#7DD3FC' : '#475569',
              }}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Motorisation */}
      <div className="glass-card p-3 mb-2">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">Motorisation</span>
          <span className="text-xs font-semibold text-cyan-400">
            {{ thermique: 'Thermique', hybride: 'Hybride', phev: 'PHEV', ev: 'Électrique' }[fuelType]}
          </span>
        </div>
        <SegButton cols={2} value={fuelType} setValue={setFuelType} options={[
          { k: 'thermique', l: 'Thermique', note: '' },
          { k: 'hybride', l: 'Hybride', note: '−100 kg' },
          { k: 'phev', l: 'PHEV >50 km', note: '≤200 kg / 15%' },
          { k: 'ev', l: 'Électrique', note: 'CO₂ + Poids' },
        ]} />
      </div>

      {/* Date immatriculation */}
      <div className="glass-card p-3 mb-2">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">Date 1ère immat</span>
          <span className="text-xs font-semibold text-amber-400">{formatDateFR(dateImmat)}</span>
        </div>
        <input
          type="date" value={dateImmat} min="2023-01-01" max="2030-12-31"
          onChange={e => setDateImmat(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-xs border outline-none mb-2.5 text-center font-medium"
          style={{ colorScheme: 'dark', fontFamily: 'inherit', background: 'rgba(80,229,229,0.05)', borderColor: 'rgba(80,229,229,0.2)', color: '#50E5E5' }}
        />
        <div className="grid grid-cols-4 gap-1">
          {DATE_PRESETS.map(p => (
            <button key={p.d} onClick={() => setDateImmat(p.d)}
              className="py-1.5 rounded-lg text-[10px] font-medium transition border active:scale-95 truncate"
              style={{
                borderColor: dateImmat === p.d ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                background: dateImmat === p.d ? 'rgba(251,191,36,0.12)' : 'transparent',
                color: dateImmat === p.d ? '#fbbf24' : '#475569',
              }}
            >{p.l}</button>
          ))}
        </div>
      </div>

      {/* Advanced params toggle */}
      <div className="mb-2">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium flex justify-between items-center transition border active:scale-[0.99]"
          style={{
            background: showAdvanced ? 'rgba(80,229,229,0.07)' : 'rgba(255,255,255,0.02)',
            borderColor: showAdvanced ? 'rgba(80,229,229,0.3)' : 'rgba(255,255,255,0.08)',
            color: showAdvanced ? '#50E5E5' : '#94a3b8',
          }}
        >
          <span>Paramètres avancés</span>
          <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: showAdvanced ? '#50E5E5' : '#64748b' }}>
            {showAdvanced ? '▲ Masquer' : '▼ Afficher'}
          </span>
        </button>

        {showAdvanced && (
          <div className="glass-card mt-2 overflow-hidden divide-y divide-white/5">
            {/* Cylindrée */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">Cylindrée</span>
                <span className="text-sm font-bold text-cyan-400">{displacement.toLocaleString('fr-FR')} cm³</span>
              </div>
              <input type="range" min={600} max={5000} step={100} value={displacement}
                onChange={e => setDisplacement(Number(e.target.value))}
                className="w-full h-1 mb-2" style={{ accentColor: '#50E5E5' }} />
              <div className="grid grid-cols-5 gap-1.5">
                {[1000, 1300, 1600, 2000, 3000].map(v => (
                  <button key={v} onClick={() => setDisplacement(v)}
                    className="py-2 rounded-lg text-xs font-medium border transition"
                    style={{ borderColor: displacement === v ? '#50E5E5' : 'rgba(255,255,255,0.1)', background: displacement === v ? 'rgba(80,229,229,0.12)' : 'transparent', color: displacement === v ? '#50E5E5' : '#64748b' }}
                  >{v === 1000 ? '1.0L' : v === 1300 ? '1.3L' : v === 1600 ? '1.6L' : v === 2000 ? '2.0L' : '3.0L'}</button>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-slate-600">🇩🇪 DE · 🇵🇹 PT · 🇳🇴 NO</div>
            </div>

            {/* Carburant */}
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-200 mb-2">Carburant</div>
              <SegButton value={fuelKind} setValue={setFuelKind} options={[
                { k: 'petrol', l: 'Essence' }, { k: 'diesel', l: 'Diesel' },
              ]} />
              <div className="mt-2 text-[11px] text-slate-600">🇩🇪 DE · 🇵🇹 PT · 🇳🇱 NL</div>
            </div>

            {/* Prix HT */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">Prix HT du véhicule</span>
                <span className="text-sm font-bold text-cyan-400">{vehiclePrice.toLocaleString('fr-FR')} €</span>
              </div>
              <input type="range" min={5000} max={150000} step={1000} value={vehiclePrice}
                onChange={e => setVehiclePrice(Number(e.target.value))}
                className="w-full h-1 mb-2" style={{ accentColor: '#50E5E5' }} />
              <div className="grid grid-cols-5 gap-1.5">
                {[15000, 25000, 35000, 50000, 80000].map(v => (
                  <button key={v} onClick={() => setVehiclePrice(v)}
                    className="py-2 rounded-lg text-xs font-medium border transition"
                    style={{ borderColor: vehiclePrice === v ? '#50E5E5' : 'rgba(255,255,255,0.1)', background: vehiclePrice === v ? 'rgba(80,229,229,0.12)' : 'transparent', color: vehiclePrice === v ? '#50E5E5' : '#64748b' }}
                  >{v / 1000}k</button>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-slate-600">🇪🇸 ES · 🇦🇹 AT · 🇫🇮 FI · 🇮🇪 IE</div>
            </div>

            {/* Région Belgique */}
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-200 mb-2">🇧🇪 Région Belgique</div>
              <SegButton cols={3} value={beRegion} setValue={setBeRegion} options={[
                { k: 'wallonie', l: 'Wallonie' }, { k: 'flandre', l: 'Flandre' }, { k: 'bruxelles', l: 'Bruxelles' },
              ]} />
            </div>

            {/* Région Espagne */}
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-200 mb-2">🇪🇸 Région Espagne</div>
              <SegButton cols={2} value={esRegion} setValue={setEsRegion} options={[
                { k: 'standard', l: 'Péninsule' }, { k: 'canarias', l: 'Canaries −50%' },
                { k: 'navarra', l: 'Navarra' }, { k: 'ceuta', l: 'Ceuta / Melilla' },
              ]} />
            </div>

            {/* Enfants à charge */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">Enfants à charge</span>
                <span className="text-[11px] text-slate-600">🇫🇷 ≥3 : −20 g/km</span>
              </div>
              <SegButton cols={5} value={childrenCount} setValue={setChildrenCount} options={
                [0,1,2,3,4].map(n => ({ k: n, l: `${n}${n >= 4 ? '+' : ''}` }))
              } />
              {childrenCount >= 3 && (
                <div className="mt-2 text-xs text-cyan-400 bg-cyan-400/7 rounded-lg px-3 py-2 text-center">
                  Famille nombreuse : −{childrenCount * 20} g/km (art. L421-70 CIBS)
                </div>
              )}
            </div>

            {/* Véhicule importé */}
            <div className="p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={isImported} onChange={e => setIsImported(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-cyan-400 cursor-pointer flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-200">🚗 Véhicule importé d'occasion</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Décote selon ancienneté — 🇫🇷 · 🇳🇱 · 🇵🇹 · 🇩🇪 · 🇪🇸 · 🇧🇪 · 🇮🇪
                  </div>
                  {isImported && (
                    <div className="mt-2 text-xs text-cyan-400 bg-cyan-400/7 rounded-lg px-3 py-2 leading-relaxed">
                      🇫🇷 −{getImportDecote(dateImmat)}% · 🇳🇱 −{getImportDecoteNL(dateImmat)}%
                      · 🇵🇹 −{getImportDecotePT(dateImmat)}% · 🇩🇪 −{getImportDecoteDE(dateImmat)}%
                      · 🇪🇸 −{getImportDecoteES(dateImmat)}% · 🇧🇪 −{getImportDecoteBE(dateImmat)}%
                      · 🇮🇪 −{getImportDecoteIE(dateImmat)}%
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-0 bg-navy-900/60 rounded-xl p-1 mb-2 flex-shrink-0">
        {[{ k: 'country', l: '🔍 Analyse par pays' }, { k: 'compare', l: '⚖️ Comparateur' }].map(tab => (
          <button key={tab.k} onClick={() => setMode(tab.k)}
            className="py-2.5 rounded-[10px] text-sm font-medium transition"
            style={{
              background: mode === tab.k ? 'rgba(80,229,229,0.16)' : 'transparent',
              color: mode === tab.k ? '#50E5E5' : '#64748b',
              fontWeight: mode === tab.k ? 600 : 400,
            }}
          >{tab.l}</button>
        ))}
      </div>

      {/* Country mode */}
      {mode === 'country' && (
        <>
          {/* Reliability filter */}
          <div className="grid grid-cols-4 gap-0 bg-navy-900/60 rounded-xl p-1 mb-2 flex-shrink-0">
            {[{ k: 'all', l: 'Tous' }, { k: 'official', l: '✓ Officiel' }, { k: 'indicative', l: '~ Indicatif' }, { k: 'info', l: 'ℹ Info' }].map(f => (
              <button key={f.k} onClick={() => setReliabilityFilter(f.k)}
                className="py-2 rounded-[9px] text-[11px] transition"
                style={{
                  background: reliabilityFilter === f.k ? 'rgba(80,229,229,0.16)' : 'transparent',
                  color: reliabilityFilter === f.k ? '#50E5E5' : '#64748b',
                  fontWeight: reliabilityFilter === f.k ? 600 : 400,
                }}
              >{f.l}</button>
            ))}
          </div>

          {/* Search */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔎  Rechercher un pays..."
            className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none mb-2"
            style={{ fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          />

          {/* Country grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 mb-3">
            {filtered.map(c => {
              const cfg = RELIABILITY_CONFIG[c.reliability]
              const isSelected = selectedCountry?.code === c.code
              return (
                <button key={c.code} onClick={() => handleCountry(c)}
                  className="py-2 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition active:scale-95"
                  style={{
                    border: `1px solid ${isSelected ? 'rgba(80,229,229,0.55)' : 'rgba(255,255,255,0.07)'}`,
                    background: isSelected ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{c.name}</span>
                  <span className="text-[9px] font-bold tracking-wide" style={{ color: cfg.color }}>{cfg.label.replace('✓ ', '').replace('~ ', '').replace('ℹ ', '')}</span>
                </button>
              )
            })}
          </div>

          {/* Results panel */}
          {result && (
            <div ref={resultRef} className="glass-card overflow-hidden animate-fade-in">
              {/* Banner */}
              <div className="bg-cyan-400/10 border-b border-cyan-400/25 px-4 py-2 text-[11px] text-cyan-400 text-center">
                📅 Calcul pour véhicule immatriculé le <strong>{formatDateFR(dateImmat)}</strong>
                {isImported && <span> · 🚗 Importé (décote {getImportDecote(dateImmat)}%)</span>}
              </div>

              {/* Header */}
              <div className="p-5 border-b border-white/7">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{result.country.flag}</span>
                  <div>
                    <div className="text-xl font-bold text-white">{result.country.name}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{result.tax_name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: RELIABILITY_CONFIG[result.reliability].color }}>
                      {RELIABILITY_CONFIG[result.reliability].label} · {result.source}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed mb-3">{result.system_description}</div>
                <div className="inline-block rounded-xl px-4 py-2"
                  style={{ background: `${sevColor(result.severity)}18`, border: `1px solid ${sevColor(result.severity)}44` }}>
                  <div className="text-[11px] text-slate-500 tracking-wider mb-0.5">SÉVÉRITÉ</div>
                  <div className="text-sm font-medium" style={{ color: sevColor(result.severity) }}>
                    {sevLabel(result.severity)}
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 divide-x divide-white/5">
                {[
                  { label: 'Seuil CO₂', value: result.threshold_gkm ? `${result.threshold_gkm} g/km` : '—' },
                  { label: `Pour ${emission} g/km`, value: result.specific_penalty, highlight: true },
                  { label: 'Maximum', value: result.max_penalty_eur ? `${result.max_penalty_eur.toLocaleString()} ${result.currency_symbol}` : 'Variable' },
                ].map((m, i) => (
                  <div key={i} className="px-4 py-3" style={{ background: m.highlight ? 'rgba(80,229,229,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">{m.label}</div>
                    <div className="text-sm font-semibold" style={{ color: m.highlight ? '#50E5E5' : '#E0E1E1' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* FR malus detail */}
              {result.malus_co2 !== undefined && (
                <div className="p-5 border-t border-white/7 bg-sky-400/3">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Détail du malus</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/7">
                      <div className="text-[11px] text-slate-500 mb-1">MALUS CO₂ ({emission} g/km)</div>
                      <div className="text-lg font-medium text-cyan-400">
                        {result.malus_co2.toLocaleString('fr-FR')} €
                      </div>
                      {fuelType === 'ev' && result.country.code === 'FR' && (
                        <div className="text-[11px] text-sky-300 mt-1">✓ EV exempté</div>
                      )}
                    </div>
                    <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/7">
                      <div className="text-[11px] text-slate-500 mb-1">
                        MALUS POIDS ({weight} kg
                        {result.country.code === 'FR' && fuelType === 'hybride' && ' · −100'}
                        {result.country.code === 'FR' && fuelType === 'phev' && ` · −${Math.min(200, Math.round(weight * 0.15))}`}
                        {result.country.code === 'FR' && (fuelType === 'hybride' || fuelType === 'phev') && ' kg'}
                        )
                      </div>
                      <div className="text-lg font-medium text-sky-300">
                        {result.malus_poids.toLocaleString('fr-FR')} €
                      </div>
                      {result.country.code === 'FR' && fuelType === 'phev' && (
                        <div className="text-[11px] text-sky-200 mt-1">
                          Masse retenue : {weight - Math.min(200, Math.round(weight * 0.15))} kg
                        </div>
                      )}
                      {result.country.code === 'FR' && fuelType === 'hybride' && (
                        <div className="text-[11px] text-sky-200 mt-1">Masse retenue : {weight - 100} kg</div>
                      )}
                      {result.country.code === 'FR' && fuelType === 'ev' && (
                        <div className="text-[11px] text-sky-300 mt-1">✓ EV exempté</div>
                      )}
                    </div>
                    <div className="rounded-lg px-3 py-2.5 border border-cyan-400/30 bg-cyan-400/8">
                      <div className="text-[11px] text-sky-200 mb-1">TOTAL À PAYER</div>
                      <div className="text-lg font-semibold text-cyan-400">
                        {result.specific_penalty_amount.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CO2 brackets */}
              {result.brackets?.length > 0 && (
                <div className="p-5 border-t border-white/7">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Barème CO₂</div>
                  <div className="flex flex-col gap-1.5">
                    {result.brackets.map((b, i) => {
                      const isActive = emission >= b.min_gkm && emission <= (b.max_gkm || 9999)
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                          style={{
                            background: isActive ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isActive ? 'rgba(80,229,229,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: isActive ? '#50E5E5' : '#475569' }} />
                          <span className="text-slate-400 w-28 flex-shrink-0">
                            {b.min_gkm}–{b.max_gkm ? b.max_gkm : '∞'} g/km
                          </span>
                          <span className={isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>
                            {b.rate_display}
                          </span>
                          {isActive && <span className="ml-auto text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">◀ actif</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Weight brackets */}
              {result.weight_brackets?.length > 0 && (
                <div className="p-5 border-t border-white/7">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Barème poids</div>
                  <div className="flex flex-col gap-1.5">
                    {result.weight_brackets.map((b, i) => {
                      const isActive = weight >= b.min_kg && weight <= (b.max_kg || 99999)
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                          style={{
                            background: isActive ? 'rgba(125,211,252,0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isActive ? 'rgba(125,211,252,0.35)' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: isActive ? '#7DD3FC' : '#475569' }} />
                          <span className="text-slate-400 w-32 flex-shrink-0">
                            {b.min_kg}–{b.max_kg ? b.max_kg : '∞'} kg
                          </span>
                          <span className={isActive ? 'text-sky-300 font-semibold' : 'text-slate-400'}>
                            {b.rate_display}
                          </span>
                          {isActive && <span className="ml-auto text-[10px] font-bold text-sky-300 bg-sky-300/10 px-2 py-0.5 rounded-full">◀ actif</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Exemptions */}
              {result.exemptions?.length > 0 && (
                <div className="p-5 border-t border-white/7">
                  <div className="text-[11px] text-slate-500 tracking-wider mb-3 uppercase">Exemptions / réductions</div>
                  <div className="flex flex-col gap-1.5">
                    {result.exemptions.map((ex, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* Compare mode */}
      {mode === 'compare' && (
        <>
          <div className="glass-card p-4 mb-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-white">Sélectionnez les pays</span>
              <span className="text-xs text-slate-500">{selectedForCompare.length}/6</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {COUNTRIES.map(c => {
                const cfg = RELIABILITY_CONFIG[c.reliability]
                const sel = selectedForCompare.find(x => x.code === c.code)
                return (
                  <button key={c.code} onClick={() => toggleCompare(c)}
                    className="py-2 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition active:scale-95"
                    style={{
                      border: `1px solid ${sel ? 'rgba(80,229,229,0.55)' : 'rgba(255,255,255,0.07)'}`,
                      background: sel ? 'rgba(80,229,229,0.1)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{c.name}</span>
                    <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label.replace('✓ ', '').replace('~ ', '').replace('ℹ ', '')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedForCompare.length >= 2 && (
            <div className="flex items-center justify-between gap-3 px-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{selectedForCompare.length} pays :</span>
                <div className="flex gap-0.5">
                  {selectedForCompare.map(c => (
                    <span key={c.code} className="text-lg leading-none">{c.flag}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const res = selectedForCompare.map(c => {
                    const d = buildCountryData(c.code, emission, weight, fuelType, dateImmat, isImported, extra)
                    return d ? { ...d, country: c } : null
                  }).filter(Boolean)
                  setCompareResults(res)
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-cyan-400/40 text-cyan-400 active:scale-95 transition"
                style={{ background: 'rgba(80,229,229,0.06)' }}
              >
                ⚖️ Comparer
              </button>
            </div>
          )}

          {compareResults.length >= 2 && (
            <div ref={compareResultRef} className="glass-card overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-white/7">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Résultats pour {emission} g/km · {weight} kg
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {[...compareResults]
                  .sort((a, b) => (a.specific_penalty_amount || 0) - (b.specific_penalty_amount || 0))
                  .map((r) => {
                    const cfg = RELIABILITY_CONFIG[r.reliability]
                    return (
                      <div key={r.country.code} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{r.country.flag}</span>
                            <div>
                              <div className="text-sm font-bold text-white">{r.country.name}</div>
                              <div className="text-[11px] text-slate-400 leading-snug">{r.tax_name}</div>
                              <div className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
                            </div>
                          </div>
                          <div className="rounded-lg px-3 py-1.5 text-center flex-shrink-0"
                            style={{ background: `${sevColor(r.severity)}18`, border: `1px solid ${sevColor(r.severity)}33` }}>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Sévérité</div>
                            <div className="text-xs font-semibold" style={{ color: sevColor(r.severity) }}>{sevLabel(r.severity)}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold"
                          style={{ color: (r.specific_penalty_amount || 0) > 0 ? '#fb923c' : '#50E5E5' }}>
                          {r.specific_penalty}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="glass-card p-4 mt-2 text-center text-[11px] text-slate-500 leading-relaxed pb-2 px-4">
        Les montants affichés sont fournis à titre indicatif et ne constituent pas un conseil fiscal. Les barèmes sont susceptibles d'évoluer — vérifiez auprès de l'autorité compétente de chaque pays avant toute acquisition.
      </div>
    </div>
  )
}
