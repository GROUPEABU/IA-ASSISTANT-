import { useState, useMemo } from 'react'
import { Plus, Calculator, ChevronRight } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useTcoVehicles } from '@/features/tco/hooks/useTcoVehicles'
import { COLORS } from '@/features/tco/constants'
import TcoConfig    from '@/features/tco/components/TcoConfig'
import VehicleForm  from '@/features/tco/components/VehicleForm'
import TcoResults   from '@/features/tco/components/TcoResults'
import { useSessionState } from '@/hooks/useSessionState'

export default function Tco() {
  const { t } = useSettings()

  const [years, setYears]         = useSessionState('abu_tco_years', 4)
  const [kmYear, setKmYear]       = useSessionState('abu_tco_km', 15000)
  const [fuelPrice, setFuelPrice] = useSessionState('abu_tco_fuel', 1.85)
  const [elecPrice, setElecPrice] = useSessionState('abu_tco_elec', 0.25)
  const [calculated, setCalculated] = useState(false)

  const globals = useMemo(
    () => ({ years, kmYear, fuelPrice, elecPrice }),
    [years, kmYear, fuelPrice, elecPrice],
  )

  const { vehicles, canAdd, canRemove, update, add, remove, toggleOpen, results } =
    useTcoVehicles(globals)

  const readyToCalc = vehicles.some(v => v.nom && Number(v.prix) > 0)
  const hasResults  = results.length >= 1

  return (
    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0 overflow-y-auto">
      <Header />

      <TcoConfig
        years={years}         onYearsChange={setYears}
        kmYear={kmYear}       onKmYearChange={setKmYear}
        fuelPrice={fuelPrice} onFuelPriceChange={setFuelPrice}
        elecPrice={elecPrice} onElecPriceChange={setElecPrice}
      />

      <div className="flex flex-col gap-2">
        {vehicles.map((v, idx) => (
          <VehicleForm
            key={v.id}
            vehicle={v}
            index={idx + 1}
            color={COLORS[idx % COLORS.length]}
            canRemove={canRemove}
            onUpdate={(field, value) => update(v.id, field, value)}
            onRemove={() => remove(v.id)}
            onToggleOpen={() => toggleOpen(v.id)}
          />
        ))}
      </div>

      {/* Add vehicle for comparison */}
      {canAdd && (
        <button
          onClick={add}
          className="glass-card px-4 py-3 flex items-center justify-center gap-2 text-sm
                     text-slate-400 hover:text-cyan-400 border-dashed transition w-full"
          style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <Plus size={15} />
          {t('add_vehicle')}
        </button>
      )}

      {/* Calculate CTA — shown when at least 1 vehicle is ready */}
      {readyToCalc && (
        <button
          onClick={() => setCalculated(true)}
          className="flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold transition-all
                     bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                     hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98]
                     shadow-lg shadow-cyan-400/20"
        >
          <Calculator size={16} />
          {t('tco_calculate_btn')}
          <ChevronRight size={16} />
        </button>
      )}

      {/* Results — shown after user clicks Calculate */}
      {hasResults && calculated && (
        <TcoResults results={results} years={years} kmYear={kmYear} />
      )}

      {/* Empty state */}
      {!readyToCalc && (
        <div className="glass-card p-8 text-center text-slate-500 text-sm">
          {t('tco_empty')}
        </div>
      )}
    </div>
  )
}

function Header() {
  const { t } = useSettings()
  return (
    <div className="flex-shrink-0">
      <h2 className="text-sm font-semibold text-white">{t('page_tco_title')}</h2>
      <p className="text-xs text-slate-500">{t('tco_description')}</p>
    </div>
  )
}
