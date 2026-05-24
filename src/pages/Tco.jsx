import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useTcoVehicles } from '@/features/tco/hooks/useTcoVehicles'
import { COLORS } from '@/features/tco/constants'
import TcoConfig    from '@/features/tco/components/TcoConfig'
import VehicleForm  from '@/features/tco/components/VehicleForm'
import TcoResults   from '@/features/tco/components/TcoResults'

export default function Tco() {
  const { t } = useSettings()

  // Global parameters
  const [years, setYears]         = useState(4)
  const [kmYear, setKmYear]       = useState(15000)
  const [fuelPrice, setFuelPrice] = useState(1.85)
  const [elecPrice, setElecPrice] = useState(0.25)

  const globals = useMemo(
    () => ({ years, kmYear, fuelPrice, elecPrice }),
    [years, kmYear, fuelPrice, elecPrice],
  )

  const { vehicles, canAdd, canRemove, update, add, remove, toggleOpen, results } =
    useTcoVehicles(globals)

  const hasResults = results.length >= 1

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

        {canAdd && (
          <button
            onClick={add}
            className="glass-card px-4 py-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-cyan-400 border-dashed transition w-full"
            style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <Plus size={15} />
            {t('add_vehicle')}
          </button>
        )}
      </div>

      {hasResults && <TcoResults results={results} years={years} kmYear={kmYear} />}

      {!hasResults && (
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
