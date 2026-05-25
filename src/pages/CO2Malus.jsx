import { useState, useRef, useEffect } from 'react'
import { COUNTRIES, CUSTOM_EMISSIONS, RELIABILITY_CONFIG } from '@/utils/malusWorld'
import { useSettings } from '@/contexts/SettingsContext'
import { useMalusCalculation } from '@/features/malus/hooks/useMalusCalculation'
import SliderSection      from '@/features/malus/components/SliderSection'
import WeightSlider       from '@/features/malus/components/WeightSlider'
import SegButton          from '@/features/malus/components/SegButton'
import RegistrationDatePicker from '@/features/malus/components/RegistrationDatePicker'
import AdvancedParams     from '@/features/malus/components/AdvancedParams'
import CountrySelector    from '@/features/malus/components/CountrySelector'
import MalusResultPanel   from '@/features/malus/components/MalusResultPanel'
import CompareView        from '@/features/malus/components/CompareView'

// Fuel options are i18n-aware — labelKey/noteKey are resolved via t() at render
const FUEL_OPTIONS = [
  { k: 'thermique', labelKey: 'malus_fuel_thermal' },
  { k: 'hybride',   labelKey: 'malus_fuel_hybrid', noteKey: 'malus_fuel_hybrid_note' },
  { k: 'phev',      labelKey: 'malus_fuel_phev',   noteKey: 'malus_fuel_phev_note' },
  { k: 'ev',        labelKey: 'malus_fuel_ev',     noteKey: 'malus_fuel_ev_note' },
]

const FUEL_LABEL_KEY = {
  thermique: 'malus_fuel_thermal',
  hybride:   'malus_fuel_hybrid',
  phev:      'malus_fuel_phev',
  ev:        'malus_fuel_ev',
}

/**
 * Smoothly scrolls the malus scroll container (or window) so the given
 * element appears at the top of the viewport with 16px breathing room.
 */
function scrollIntoView(element) {
  if (!element) return
  const scroller = document.querySelector('main') || window
  const top = element.getBoundingClientRect().top + (scroller === window ? window.scrollY : scroller.scrollTop) - 16
  if (scroller === window) {
    window.scrollTo({ top, behavior: 'smooth' })
  } else {
    scroller.scrollTo({ top, behavior: 'smooth' })
  }
}

export default function CO2Malus() {
  const { t, formatCurrency } = useSettings()
  const malus = useMalusCalculation()

  const [search, setSearch]                   = useState('')
  const [mode, setMode]                       = useState('country')
  const [reliabilityFilter, setReliabilityFilter] = useState('all')
  const [showAdvanced, setShowAdvanced]       = useState(false)

  const resultRef        = useRef(null)
  const compareResultRef = useRef(null)

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    (reliabilityFilter === 'all' || c.reliability === reliabilityFilter)
  )

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (malus.result) {
      const id = setTimeout(() => scrollIntoView(resultRef.current), 60)
      return () => clearTimeout(id)
    }
  }, [malus.result])

  useEffect(() => {
    if (malus.compareResults.length >= 2) {
      const id = setTimeout(() => scrollIntoView(compareResultRef.current), 60)
      return () => clearTimeout(id)
    }
  }, [malus.compareResults])

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <Header t={t} />
      <ReliabilityLegend />

      <SliderSection
        label={t('malus_emissions_label')}
        value={malus.emission}
        setValue={malus.setEmission}
        min={0} max={400}
        unit="g/km" color="#50E5E5"
        presets={CUSTOM_EMISSIONS}
      />

      <WeightSlider value={malus.weight} onChange={malus.setWeight} />

      <div className="glass-card p-3 mb-2">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">{t('malus_motorisation')}</span>
          <span className="text-xs font-semibold text-cyan-400">{t(FUEL_LABEL_KEY[malus.fuelType])}</span>
        </div>
        <SegButton
          cols={2}
          value={malus.fuelType}
          setValue={malus.setFuelType}
          options={FUEL_OPTIONS.map(o => ({
            k: o.k,
            l: t(o.labelKey),
            note: o.noteKey ? t(o.noteKey) : '',
          }))}
        />
      </div>

      <RegistrationDatePicker value={malus.dateImmat} onChange={malus.setDateImmat} />

      <AdvancedParams
        show={showAdvanced}
        onToggle={() => setShowAdvanced(v => !v)}
        displacement={malus.displacement}   setDisplacement={malus.setDisplacement}
        fuelKind={malus.fuelKind}           setFuelKind={malus.setFuelKind}
        vehiclePrice={malus.vehiclePrice}   setVehiclePrice={malus.setVehiclePrice}
        beRegion={malus.beRegion}           setBeRegion={malus.setBeRegion}
        esRegion={malus.esRegion}           setEsRegion={malus.setEsRegion}
        childrenCount={malus.childrenCount} setChildrenCount={malus.setChildrenCount}
        isImported={malus.isImported}       setIsImported={malus.setIsImported}
        dateImmat={malus.dateImmat}
        formatCurrency={formatCurrency}
      />

      <ModeTabs value={mode} onChange={setMode} />

      {mode === 'country' && (
        <>
          <CountrySelector
            countries={filteredCountries}
            search={search}
            onSearchChange={setSearch}
            reliabilityFilter={reliabilityFilter}
            onReliabilityChange={setReliabilityFilter}
            selectedCountry={malus.selectedCountry}
            onSelect={malus.selectCountry}
          />
          {malus.result && (
            <MalusResultPanel
              result={malus.result}
              dateImmat={malus.dateImmat}
              isImported={malus.isImported}
              emission={malus.emission}
              weight={malus.weight}
              fuelType={malus.fuelType}
              formatCurrency={formatCurrency}
              panelRef={resultRef}
            />
          )}
        </>
      )}

      {mode === 'compare' && (
        <CompareView
          selectedForCompare={malus.selectedForCompare}
          onToggleCountry={malus.toggleCompareCountry}
          onRunCompare={malus.runManualCompare}
          compareResults={malus.compareResults}
          emission={malus.emission}
          weight={malus.weight}
          panelRef={compareResultRef}
        />
      )}

      <Disclaimer t={t} />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Header({ t }) {
  return (
    <div className="flex-shrink-0">
      <h2 className="text-sm font-semibold text-white">{t('malus_page_title')}</h2>
      <p className="text-xs text-slate-500">{t('malus_page_subtitle')}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">
        {t('malus_page_intro_disclaimer')}
      </p>
    </div>
  )
}

function ReliabilityLegend() {
  const { t } = useSettings()
  return (
    <div className="glass-card px-3 py-2.5 flex-shrink-0">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {Object.entries(RELIABILITY_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: v.color, boxShadow: `0 0 5px ${v.color}88` }}
            />
            <span className="font-semibold" style={{ color: v.color }}>{t(v.labelKey)}</span>
            <span className="text-slate-600">{t(v.descKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModeTabs({ value, onChange }) {
  const tabs = [
    { k: 'country', l: '🔍 Analyse par pays' },
    { k: 'compare', l: '⚖️ Comparateur' },
  ]
  return (
    <div role="tablist" className="grid grid-cols-2 gap-0 bg-navy-900/60 rounded-xl p-1 mb-2 flex-shrink-0">
      {tabs.map(tab => {
        const isActive = value === tab.k
        return (
          <button
            key={tab.k}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.k)}
            className="py-2.5 rounded-[10px] text-sm font-medium transition"
            style={{
              background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
              color:      isActive ? '#50E5E5' : '#64748b',
              fontWeight: isActive ? 600 : 400,
            }}
          >{tab.l}</button>
        )
      })}
    </div>
  )
}

function Disclaimer({ t }) {
  return (
    <div className="glass-card p-4 mt-2 text-center text-[11px] text-slate-500 leading-relaxed pb-2 px-4">
      {t('co2_disclaimer')}
    </div>
  )
}
