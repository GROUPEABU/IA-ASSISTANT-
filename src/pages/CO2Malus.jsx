import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { RotateCcw, Info, Globe, Calculator, Search, Scale } from 'lucide-react'
import { COUNTRIES, CUSTOM_EMISSIONS, RELIABILITY_CONFIG, getCountryRequiredFields } from '@/utils/malusWorld'
import { getCountryName } from '@/utils/malusLabels'
import { useSettings } from '@/contexts/SettingsContext'
import { useMalusCalculation } from '@/features/malus/hooks/useMalusCalculation'
import SliderSection      from '@/features/malus/components/SliderSection'
import WeightSlider       from '@/features/malus/components/WeightSlider'
import SegButton          from '@/features/malus/components/SegButton'
import RegistrationDatePicker from '@/features/malus/components/RegistrationDatePicker'
import AdvancedParams     from '@/features/malus/components/AdvancedParams'
import CountrySelector    from '@/features/malus/components/CountrySelector'
import MalusResultPanel   from '@/features/malus/components/MalusResultPanel'
import { CompareCountrySelect, CompareResultsPanel } from '@/features/malus/components/CompareView'

const FIELD_ORDER = ['displacement', 'fuelKind', 'vehiclePrice', 'beRegion', 'esRegion', 'childrenCount', 'isImported']

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

function scrollToRef(ref) {
  if (!ref?.current) return
  const scroller = document.querySelector('main') || window
  const top = ref.current.getBoundingClientRect().top + (scroller === window ? window.scrollY : scroller.scrollTop) - 16
  if (scroller === window) window.scrollTo({ top, behavior: 'smooth' })
  else scroller.scrollTo({ top, behavior: 'smooth' })
}

export default function CO2Malus() {
  const { t, lang, formatCurrency } = useSettings()
  const malus = useMalusCalculation()

  const [search, setSearch]                       = useState('')
  const [mode, setMode]                           = useState('country')
  const [reliabilityFilter, setReliabilityFilter] = useState('all')
  const [showAdvanced, setShowAdvanced]           = useState(false)

  // Gate result display — user must click "Calculer" to reveal
  const [resultVisible, setResultVisible]   = useState(false)
  const [compareVisible, setCompareVisible] = useState(false)

  const resultRef        = useRef(null)
  const compareResultRef = useRef(null)

  // Reset result visibility whenever any significant input changes
  useEffect(() => { setResultVisible(false) }, [
    malus.selectedCountry, malus.emission, malus.weight, malus.fuelType,
    malus.dateImmat, malus.displacement, malus.vehiclePrice, malus.fuelKind,
    malus.beRegion, malus.esRegion, malus.childrenCount, malus.isImported,
  ])
  useEffect(() => { setCompareVisible(false) }, [
    malus.selectedForCompare, malus.emission, malus.weight, malus.fuelType,
    malus.dateImmat, malus.displacement, malus.vehiclePrice, malus.fuelKind,
    malus.beRegion, malus.esRegion, malus.childrenCount, malus.isImported,
  ])

  const handleCalculate = useCallback(() => {
    setResultVisible(true)
    setTimeout(() => scrollToRef(resultRef), 120)
  }, [])

  const handleCompare = useCallback(() => {
    malus.runManualCompare()
    setCompareVisible(true)
    setTimeout(() => scrollToRef(compareResultRef), 120)
  }, [malus])

  const handleReset = useCallback(() => {
    malus.reset()
    setSearch('')
    setMode('country')
    setReliabilityFilter('all')
    setShowAdvanced(false)
    setResultVisible(false)
    setCompareVisible(false)
  }, [malus])

  const filteredCountries = COUNTRIES.filter(c => {
    const localName = getCountryName(c.code, lang) || ''
    const q = search.toLowerCase()
    return (
      (c.name.toLowerCase().includes(q) || localName.toLowerCase().includes(q)) &&
      (reliabilityFilter === 'all' || c.reliability === reliabilityFilter)
    )
  })

  const requiredCtx = useMemo(() => {
    const countries = mode === 'country'
      ? (malus.selectedCountry ? [malus.selectedCountry] : [])
      : malus.selectedForCompare
    if (countries.length === 0) return null

    const byField = {}
    countries.forEach(c => {
      getCountryRequiredFields(c.code).forEach(f => {
        if (!byField[f]) byField[f] = []
        byField[f].push({ code: c.code, flag: c.flag, name: getCountryName(c.code, lang) || c.name })
      })
    })
    const fields = FIELD_ORDER.filter(f => byField[f])
    const labelled = countries.map(c => ({ code: c.code, flag: c.flag, name: getCountryName(c.code, lang) || c.name }))
    return { fields, byField, countries: labelled }
  }, [mode, malus.selectedCountry, malus.selectedForCompare, lang])

  const canCalcSingle  = !!malus.selectedCountry
  const canCalcCompare = malus.selectedForCompare.length >= 2

  return (
    <div className="flex flex-col gap-0 animate-fade-in">
      {/* ── Header ── */}
      <PageHeader t={t} onReset={handleReset} />

      {/* ── Mode tabs ── */}
      <ModeTabs value={mode} onChange={(m) => { setMode(m); setResultVisible(false); setCompareVisible(false) }} />

      {/* ── Step 1 : Pays ── */}
      <StepSection number={1} label={t('malus_step_country')}>
        {mode === 'country' && (
          <CountrySelector
            countries={filteredCountries}
            search={search}
            onSearchChange={setSearch}
            reliabilityFilter={reliabilityFilter}
            onReliabilityChange={setReliabilityFilter}
            selectedCountry={malus.selectedCountry}
            onSelect={malus.selectCountry}
          />
        )}
        {mode === 'compare' && (
          <CompareCountrySelect
            selectedForCompare={malus.selectedForCompare}
            onToggleCountry={malus.toggleCompareCountry}
          />
        )}
      </StepSection>

      {/* ── Step 2 : Paramètres du véhicule ── */}
      <StepSection number={2} label={t('malus_step_params')}>
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
      </StepSection>

      {/* ── Step 3 : Champs spécifiques (conditionnel) ── */}
      {requiredCtx && (
        <StepSection number={3} label={t('malus_step_specific')}>
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
            requiredCtx={requiredCtx}
          />
        </StepSection>
      )}

      {/* ── CTA Calculer ── */}
      <div className="px-0 pt-2 pb-1">
        {mode === 'country' ? (
          <CalculateCTA
            disabled={!canCalcSingle}
            label={canCalcSingle
              ? `${t('malus_calc_btn_for')} ${malus.selectedCountry.flag} ${getCountryName(malus.selectedCountry.code, lang) || malus.selectedCountry.name}`
              : t('malus_select_country_first')}
            onClick={handleCalculate}
          />
        ) : (
          <CalculateCTA
            disabled={!canCalcCompare}
            label={canCalcCompare
              ? t('malus_calc_compare').replace('{n}', malus.selectedForCompare.length)
              : t('malus_select_2_min')}
            onClick={handleCompare}
            compare
          />
        )}
      </div>

      {/* ── Résultats (cachés jusqu'au clic Calculer) ── */}
      {mode === 'country' && resultVisible && malus.result && (
        <div ref={resultRef} className="mt-2">
          <MalusResultPanel
            result={malus.result}
            dateImmat={malus.dateImmat}
            isImported={malus.isImported}
            emission={malus.emission}
            weight={malus.weight}
            fuelType={malus.fuelType}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {mode === 'compare' && compareVisible && (
        <div ref={compareResultRef} className="mt-2">
          <CompareResultsPanel
            selectedForCompare={malus.selectedForCompare}
            onRunCompare={malus.runManualCompare}
            compareResults={malus.compareResults}
            emission={malus.emission}
            weight={malus.weight}
          />
        </div>
      )}

      <Disclaimer t={t} />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PageHeader({ t, onReset }) {
  return (
    <div
      className="glass-card rounded-2xl p-5 mb-4 flex flex-col gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(7,24,40,0.95) 0%, rgba(13,39,60,0.85) 100%)',
        border: '1px solid rgba(80,229,229,0.18)',
        boxShadow: '0 0 32px rgba(80,229,229,0.05)',
      }}
    >
      {/* Top row — icon + title + reset */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(80,229,229,0.12)', border: '1px solid rgba(80,229,229,0.3)' }}
          >
            <Globe size={24} style={{ color: '#50E5E5' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight tracking-tight">
              {t('malus_page_title')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{t('malus_page_subtitle')}</p>
          </div>
        </div>
        <button
          onClick={onReset}
          title={t('malus_reset')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium
                     text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40
                     hover:bg-cyan-400/5 active:scale-95 transition-all flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <RotateCcw size={13} />
          {t('malus_reset')}
        </button>
      </div>

      {/* Reliability legend */}
      <div
        className="rounded-xl px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5 justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
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

      {/* Disclaimer note */}
      <p className="text-[11px] text-slate-600 leading-relaxed">
        {t('malus_page_intro_disclaimer')}
      </p>
    </div>
  )
}

function StepSection({ number, label, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ background: 'rgba(80,229,229,0.14)', border: '1px solid rgba(80,229,229,0.30)', color: '#50E5E5' }}
        >{number}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(80,229,229,0.15), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

function ModeTabs({ value, onChange }) {
  const { t } = useSettings()
  const tabs = [
    { k: 'country', lKey: 'co2_tab_country', Icon: Search },
    { k: 'compare', lKey: 'co2_tab_compare', Icon: Scale  },
  ]
  return (
    <div role="tablist" className="mode-tabs grid grid-cols-2 gap-1 rounded-xl p-1 mb-4 flex-shrink-0"
         style={{ background: 'rgba(7,24,40,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {tabs.map(({ k, lKey, Icon }) => {
        const isActive = value === k
        return (
          <button
            key={k}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(k)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all"
            style={{
              background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
              color:      isActive ? '#50E5E5' : '#64748b',
              fontWeight: isActive ? 600 : 400,
              border:     isActive ? '1px solid rgba(80,229,229,0.25)' : '1px solid transparent',
            }}
          >
            <Icon size={14} aria-hidden="true" />
            {t(lKey)}
          </button>
        )
      })}
    </div>
  )
}

function CalculateCTA({ disabled, label, onClick, compare }) {
  const CYAN = '#50E5E5'
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 text-sm font-bold transition-all active:scale-[0.98]"
      style={disabled ? {
        background: 'rgba(255,255,255,0.04)',
        border:     '1px solid rgba(255,255,255,0.08)',
        color:      '#475569',
        cursor:     'not-allowed',
      } : {
        background: compare
          ? 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.85) 100%)'
          : `linear-gradient(135deg, rgba(14,165,233,0.90) 0%, ${CYAN}CC 100%)`,
        border:     `1px solid ${compare ? 'rgba(139,92,246,0.5)' : 'rgba(80,229,229,0.4)'}`,
        color:      '#fff',
        boxShadow:  compare
          ? '0 4px 20px rgba(99,102,241,0.3)'
          : '0 4px 20px rgba(80,229,229,0.2)',
      }}
    >
      <Calculator size={17} aria-hidden="true" />
      {label}
    </button>
  )
}

function Disclaimer({ t }) {
  return (
    <div className="mt-6 mb-2 rounded-2xl border border-warn/25 bg-warn/[0.06] px-5 py-4 flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-xl bg-warn/15 border border-warn/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Info size={18} className="text-warn" />
      </div>
      <div>
        <p className="text-sm font-semibold text-warn mb-1">{t('co2_disclaimer_title')}</p>
        <p className="text-[13px] text-slate-300 leading-relaxed">{t('co2_disclaimer')}</p>
      </div>
    </div>
  )
}
