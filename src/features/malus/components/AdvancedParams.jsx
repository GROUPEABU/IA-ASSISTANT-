import {
  getImportDecote, getImportDecoteNL, getImportDecotePT,
  getImportDecoteDE, getImportDecoteES, getImportDecoteBE, getImportDecoteIE,
} from '@/utils/malusWorld'
import SegButton from './SegButton'

/**
 * Collapsible "Advanced parameters" panel for the malus calculator.
 * Groups cylindrée / fuel kind / vehicle price / regional toggles /
 * dependent children / imported flag.
 *
 * Each section operates on a single parent-controlled value via setters
 * to avoid prop-drilling a single mega-state object.
 */
export default function AdvancedParams({
  show, onToggle,
  displacement, setDisplacement,
  fuelKind, setFuelKind,
  vehiclePrice, setVehiclePrice,
  beRegion, setBeRegion,
  esRegion, setEsRegion,
  childrenCount, setChildrenCount,
  isImported, setIsImported,
  dateImmat,
  formatCurrency,
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        aria-expanded={show}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium flex justify-between items-center transition border active:scale-[0.99]"
        style={{
          background:  show ? 'rgba(80,229,229,0.07)' : 'rgba(255,255,255,0.02)',
          borderColor: show ? 'rgba(80,229,229,0.3)' : 'rgba(255,255,255,0.08)',
          color:       show ? '#50E5E5' : '#94a3b8',
        }}
      >
        <span>Paramètres avancés</span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-md"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: show ? '#50E5E5' : '#64748b',
          }}
        >
          {show ? '▲ Masquer' : '▼ Afficher'}
        </span>
      </button>

      {show && (
        <div className="glass-card mt-2 overflow-hidden divide-y divide-white/5">
          <DisplacementSection value={displacement} onChange={setDisplacement} />
          <FuelKindSection      value={fuelKind}      onChange={setFuelKind} />
          <VehiclePriceSection  value={vehiclePrice}  onChange={setVehiclePrice} formatCurrency={formatCurrency} />
          <BeRegionSection      value={beRegion}      onChange={setBeRegion} />
          <EsRegionSection      value={esRegion}      onChange={setEsRegion} />
          <ChildrenSection      value={childrenCount} onChange={setChildrenCount} />
          <ImportedSection      value={isImported}    onChange={setIsImported} dateImmat={dateImmat} />
        </div>
      )}
    </div>
  )
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function DisplacementSection({ value, onChange }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">Cylindrée</span>
        <span className="text-sm font-bold text-cyan-400">{value.toLocaleString('fr-FR')} cm³</span>
      </div>
      <input
        type="range" min={600} max={5000} step={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label="Cylindrée"
        className="w-full h-1 mb-2"
        style={{ accentColor: '#50E5E5' }}
      />
      <div className="grid grid-cols-5 gap-1.5">
        {[1000, 1300, 1600, 2000, 3000].map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="py-2 rounded-lg text-xs font-medium border transition"
            style={{
              borderColor: value === v ? '#50E5E5' : 'rgba(255,255,255,0.1)',
              background:  value === v ? 'rgba(80,229,229,0.12)' : 'transparent',
              color:       value === v ? '#50E5E5' : '#64748b',
            }}
          >
            {v === 1000 ? '1.0L' : v === 1300 ? '1.3L' : v === 1600 ? '1.6L' : v === 2000 ? '2.0L' : '3.0L'}
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-600">🇩🇪 DE · 🇵🇹 PT · 🇳🇴 NO</div>
    </div>
  )
}

function FuelKindSection({ value, onChange }) {
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">Carburant</div>
      <SegButton
        value={value}
        setValue={onChange}
        options={[
          { k: 'petrol', l: 'Essence' },
          { k: 'diesel', l: 'Diesel' },
        ]}
      />
      <div className="mt-2 text-[11px] text-slate-600">🇩🇪 DE · 🇵🇹 PT · 🇳🇱 NL</div>
    </div>
  )
}

function VehiclePriceSection({ value, onChange, formatCurrency }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">Prix HT du véhicule</span>
        <span className="text-sm font-bold text-cyan-400">{formatCurrency(value)}</span>
      </div>
      <input
        type="range" min={5000} max={150000} step={1000} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label="Prix du véhicule"
        className="w-full h-1 mb-2"
        style={{ accentColor: '#50E5E5' }}
      />
      <div className="grid grid-cols-5 gap-1.5">
        {[15000, 25000, 35000, 50000, 80000].map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="py-2 rounded-lg text-xs font-medium border transition"
            style={{
              borderColor: value === v ? '#50E5E5' : 'rgba(255,255,255,0.1)',
              background:  value === v ? 'rgba(80,229,229,0.12)' : 'transparent',
              color:       value === v ? '#50E5E5' : '#64748b',
            }}
          >{v / 1000}k</button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-600">🇪🇸 ES · 🇦🇹 AT · 🇫🇮 FI · 🇮🇪 IE</div>
    </div>
  )
}

function BeRegionSection({ value, onChange }) {
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">🇧🇪 Région Belgique</div>
      <SegButton
        cols={3}
        value={value}
        setValue={onChange}
        options={[
          { k: 'wallonie',  l: 'Wallonie' },
          { k: 'flandre',   l: 'Flandre' },
          { k: 'bruxelles', l: 'Bruxelles' },
        ]}
      />
    </div>
  )
}

function EsRegionSection({ value, onChange }) {
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">🇪🇸 Région Espagne</div>
      <SegButton
        cols={2}
        value={value}
        setValue={onChange}
        options={[
          { k: 'standard', l: 'Péninsule' },
          { k: 'canarias', l: 'Canaries −50%' },
          { k: 'navarra',  l: 'Navarra' },
          { k: 'ceuta',    l: 'Ceuta / Melilla' },
        ]}
      />
    </div>
  )
}

function ChildrenSection({ value, onChange }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">Enfants à charge</span>
        <span className="text-[11px] text-slate-600">🇫🇷 ≥3 : −20 g/km</span>
      </div>
      <SegButton
        cols={5}
        value={value}
        setValue={onChange}
        options={[0, 1, 2, 3, 4].map(n => ({ k: n, l: `${n}${n >= 4 ? '+' : ''}` }))}
      />
      {value >= 3 && (
        <div className="mt-2 text-xs text-cyan-400 bg-cyan-400/7 rounded-lg px-3 py-2 text-center">
          Famille nombreuse : −{value * 20} g/km (art. L421-70 CIBS)
        </div>
      )}
    </div>
  )
}

function ImportedSection({ value, onChange, dateImmat }) {
  return (
    <div className="p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-cyan-400 cursor-pointer flex-shrink-0"
        />
        <div>
          <div className="text-sm font-semibold text-slate-200">🚗 Véhicule importé d'occasion</div>
          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Décote selon ancienneté — 🇫🇷 · 🇳🇱 · 🇵🇹 · 🇩🇪 · 🇪🇸 · 🇧🇪 · 🇮🇪
          </div>
          {value && (
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
  )
}
