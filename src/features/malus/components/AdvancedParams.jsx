import { ChevronDown, SlidersHorizontal, Check } from 'lucide-react'
import {
  getImportDecote, getImportDecoteNL, getImportDecotePT,
  getImportDecoteDE, getImportDecoteES, getImportDecoteBE, getImportDecoteIE,
} from '@/utils/malusWorld'
import { useSettings } from '@/contexts/SettingsContext'
import SegButton from './SegButton'

// Countries that use each parameter — shown as full names when no country is selected
const FIELD_COUNTRIES = {
  displacement:  ['DE', 'PT', 'NO'],
  fuelKind:      ['DE', 'PT', 'NL', 'IE'],
  vehiclePrice:  ['DK', 'ES', 'AT', 'FI', 'IE', 'GB'],
  beRegion:      ['BE'],
  esRegion:      ['ES'],
  childrenCount: ['FR'],
  isImported:    ['FR', 'NL', 'PT', 'DE', 'ES', 'BE', 'IE'],
}

const COUNTRY_META = {
  DE: { name: 'Allemagne',    flag: '🇩🇪' },
  PT: { name: 'Portugal',     flag: '🇵🇹' },
  NO: { name: 'Norvège',      flag: '🇳🇴' },
  NL: { name: 'Pays-Bas',     flag: '🇳🇱' },
  IE: { name: 'Irlande',      flag: '🇮🇪' },
  DK: { name: 'Danemark',     flag: '🇩🇰' },
  ES: { name: 'Espagne',      flag: '🇪🇸' },
  AT: { name: 'Autriche',     flag: '🇦🇹' },
  FI: { name: 'Finlande',     flag: '🇫🇮' },
  GB: { name: 'Royaume-Uni',  flag: '🇬🇧' },
  BE: { name: 'Belgique',     flag: '🇧🇪' },
  FR: { name: 'France',       flag: '🇫🇷' },
}

/**
 * Contextual country hint shown below each parameter section.
 * - No country selected → list full country names that use this field
 * - Country selected + field active → green "Active" badge
 * - Country selected + field inactive → muted "Not used" note
 *
 * For isImported, we check against FIELD_COUNTRIES rather than advanced_params
 * (since import decote is not listed as an advanced_param on country records).
 */
function CountryHint({ fieldKey, selectedCountry, activeParams }) {
  if (selectedCountry) {
    let isActive
    if (fieldKey === 'isImported') {
      isActive = FIELD_COUNTRIES.isImported.includes(selectedCountry.code)
    } else {
      isActive = activeParams?.includes(fieldKey)
    }
    if (isActive) {
      return (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#34d399', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)' }}
          >
            <Check size={11} strokeWidth={3} className="flex-shrink-0" />
            Actif · {selectedCountry.flag} {selectedCountry.name}
          </span>
        </div>
      )
    }
    return (
      <p className="mt-2 text-[10px] text-slate-600 italic">
        Non requis pour {selectedCountry.flag} {selectedCountry.name}
      </p>
    )
  }

  // No country selected — list relevant countries with full names
  const codes = FIELD_COUNTRIES[fieldKey] || []
  if (!codes.length) return null
  return (
    <p className="mt-2 text-[10px] text-slate-600 leading-relaxed">
      {codes.map(code => {
        const m = COUNTRY_META[code]
        return m ? `${m.flag} ${m.name}` : code
      }).join(' · ')}
    </p>
  )
}

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
  selectedCountry,
  activeParams,
}) {
  const { t } = useSettings()
  const hint = { selectedCountry, activeParams }

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        aria-expanded={show}
        className="advanced-toggle w-full px-4 py-3.5 rounded-xl text-sm font-semibold flex justify-between items-center transition-all border-2 active:scale-[0.99] gap-3"
        style={{
          background:  show ? 'rgba(80,229,229,0.10)' : 'rgba(80,229,229,0.04)',
          borderColor: show ? 'rgba(80,229,229,0.45)' : 'rgba(80,229,229,0.20)',
          color:       show ? '#50E5E5' : '#94a3b8',
          boxShadow:   show ? '0 0 16px rgba(80,229,229,0.08)' : 'none',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: show ? 'rgba(80,229,229,0.2)' : 'rgba(80,229,229,0.08)', color: '#50E5E5' }}
          >
            <SlidersHorizontal size={13} />
          </span>
          <span className="truncate">{t('malus_advanced_params')}</span>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(80,229,229,0.12)',
              border:     '1px solid rgba(80,229,229,0.25)',
              color:      '#50E5E5',
            }}
          >7 {t('malus_show')}</span>
        </div>
        <ChevronDown
          size={16}
          style={{ color: '#50E5E5', transition: 'transform 200ms', transform: show ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        />
      </button>

      {show && (
        <div className="glass-card mt-2 overflow-hidden divide-y divide-white/5">
          <DisplacementSection value={displacement} onChange={setDisplacement} hint={hint} />
          <FuelKindSection      value={fuelKind}      onChange={setFuelKind}      hint={hint} />
          <VehiclePriceSection  value={vehiclePrice}  onChange={setVehiclePrice} formatCurrency={formatCurrency} hint={hint} />
          <BeRegionSection      value={beRegion}      onChange={setBeRegion}      hint={hint} />
          <EsRegionSection      value={esRegion}      onChange={setEsRegion}      hint={hint} />
          <ChildrenSection      value={childrenCount} onChange={setChildrenCount} hint={hint} />
          <ImportedSection      value={isImported}    onChange={setIsImported}    dateImmat={dateImmat} hint={hint} />
        </div>
      )}
    </div>
  )
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function DisplacementSection({ value, onChange, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">{t('malus_displacement_label')}</span>
        <span className="text-sm font-bold text-cyan-400">{value.toLocaleString('fr-FR')} cm³</span>
      </div>
      <input
        type="range" min={600} max={5000} step={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={t('malus_displacement_label')}
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
      <CountryHint fieldKey="displacement" {...hint} />
    </div>
  )
}

function FuelKindSection({ value, onChange, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">{t('malus_fuel_kind_label')}</div>
      <SegButton
        value={value}
        setValue={onChange}
        options={[
          { k: 'petrol', l: t('malus_petrol') },
          { k: 'diesel', l: t('malus_diesel') },
        ]}
      />
      <CountryHint fieldKey="fuelKind" {...hint} />
    </div>
  )
}

function VehiclePriceSection({ value, onChange, formatCurrency, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">{t('malus_vehicle_price_ht')}</span>
        <span className="text-sm font-bold text-cyan-400">{formatCurrency(value)}</span>
      </div>
      <input
        type="range" min={5000} max={150000} step={1000} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={t('malus_vehicle_price_ht')}
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
      <CountryHint fieldKey="vehiclePrice" {...hint} />
    </div>
  )
}

function BeRegionSection({ value, onChange, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">{t('malus_be_region_label')}</div>
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
      <CountryHint fieldKey="beRegion" {...hint} />
    </div>
  )
}

function EsRegionSection({ value, onChange, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-slate-200 mb-2">{t('malus_es_region_label')}</div>
      <SegButton
        cols={2}
        value={value}
        setValue={onChange}
        options={[
          { k: 'standard', l: t('malus_es_peninsula') },
          { k: 'canarias', l: 'Canaries −50%' },
          { k: 'navarra',  l: 'Navarra' },
          { k: 'ceuta',    l: 'Ceuta / Melilla' },
        ]}
      />
      <CountryHint fieldKey="esRegion" {...hint} />
    </div>
  )
}

function ChildrenSection({ value, onChange, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-200">{t('malus_children_label')}</span>
      </div>
      <SegButton
        cols={5}
        value={value}
        setValue={onChange}
        options={[0, 1, 2, 3, 4].map(n => ({ k: n, l: `${n}${n >= 4 ? '+' : ''}` }))}
      />
      {value >= 3 && (
        <div className="mt-2 text-xs text-cyan-400 bg-cyan-400/7 rounded-lg px-3 py-2 text-center">
          {t('malus_large_family').replace('{n}', value * 20)}
        </div>
      )}
      <CountryHint fieldKey="childrenCount" {...hint} />
    </div>
  )
}

function ImportedSection({ value, onChange, dateImmat, hint }) {
  const { t } = useSettings()
  return (
    <div className="p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-cyan-400 cursor-pointer flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200">{t('malus_imported_label')}</div>
          {value && (
            <div className="mt-2 text-xs text-cyan-400 bg-cyan-400/7 rounded-lg px-3 py-2 leading-relaxed">
              🇫🇷 −{getImportDecote(dateImmat)}% · 🇳🇱 −{getImportDecoteNL(dateImmat)}%
              · 🇵🇹 −{getImportDecotePT(dateImmat)}% · 🇩🇪 −{getImportDecoteDE(dateImmat)}%
              · 🇪🇸 −{getImportDecoteES(dateImmat)}% · 🇧🇪 −{getImportDecoteBE(dateImmat)}%
              · 🇮🇪 −{getImportDecoteIE(dateImmat)}%
            </div>
          )}
          <CountryHint fieldKey="isImported" {...hint} />
        </div>
      </label>
    </div>
  )
}
