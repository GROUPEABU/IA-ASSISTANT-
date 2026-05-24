import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { formatNumber } from '@/utils/formatters'
import { FUEL_LABELS, MAINT_TIERS, getMaintDefault } from '../constants'

const CONSUMPTION_PLACEHOLDERS = {
  ev:        '17',
  phev:      '2.4',
  hybride:   '5.3',
  thermique: '7.0',
}

/**
 * Single-vehicle form for the TCO calculator.
 *
 * @param {object}    props
 * @param {object}    props.vehicle       — vehicle state object
 * @param {number}    props.index         — position in the list (1-indexed display)
 * @param {string}    props.color         — accent color
 * @param {boolean}   props.canRemove     — show remove button (only when >1 vehicle)
 * @param {function}  props.onUpdate      — (field, value) => void
 * @param {function}  props.onRemove      — () => void
 * @param {function}  props.onToggleOpen  — () => void
 */
export default function VehicleForm({ vehicle, index, color, canRemove, onUpdate, onRemove, onToggleOpen }) {
  const { t } = useSettings()
  const v = vehicle

  return (
    <div className="glass-card overflow-hidden">
      <VehicleHeader
        vehicle={v}
        index={index}
        color={color}
        canRemove={canRemove}
        onToggleOpen={onToggleOpen}
        onRemove={onRemove}
      />

      {v.open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          {/* Name */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider">
              {t('vehicle_name_label')}
            </label>
            <input
              value={v.nom}
              onChange={e => onUpdate('nom', e.target.value)}
              placeholder={t('vehicle_name_ph')}
              className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Price + CO2 */}
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label={`${t('price_label')} (€)`}
              value={v.prix}
              onChange={val => onUpdate('prix', val)}
              placeholder="28 900"
            />
            <NumberField
              label={t('co2_input_label')}
              value={v.co2}
              onChange={val => onUpdate('co2', val)}
              placeholder="120"
            />
          </div>

          {/* Fuel type */}
          <FuelTypeSelector value={v.fuelType} onChange={val => onUpdate('fuelType', val)} label={t('powertrain_label')} />

          {/* Consumption */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider">
              {t('consumption_label')} ({v.fuelType === 'ev' ? 'kWh/100km' : 'L/100km'})
            </label>
            <input
              type="number"
              step="0.1"
              value={v.conso}
              onChange={e => onUpdate('conso', e.target.value)}
              placeholder={CONSUMPTION_PLACEHOLDERS[v.fuelType] || CONSUMPTION_PLACEHOLDERS.thermique}
              className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
              style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
            />
          </div>

          {/* Maintenance tier + override */}
          <MaintenanceField vehicle={v} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  )
}

function VehicleHeader({ vehicle, index, color, canRemove, onToggleOpen, onRemove }) {
  const v = vehicle
  return (
    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggleOpen}>
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-navy-900"
        style={{ background: color }}
      >
        {index}
      </span>
      <span
        className="flex-1 text-sm font-medium truncate"
        style={{ color: v.nom ? '#E0E1E1' : '#475569' }}
      >
        {v.nom || `Véhicule ${index}`}
      </span>
      {v.nom && Number(v.prix) > 0 && (
        <span className="text-xs text-slate-500">{formatNumber(Number(v.prix))} €</span>
      )}
      <div className="flex items-center gap-2">
        {canRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            aria-label={`Supprimer ${v.nom || `véhicule ${index}`}`}
            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-400 transition rounded"
          >
            <Trash2 size={13} />
          </button>
        )}
        {v.open
          ? <ChevronUp size={14} className="text-slate-500" />
          : <ChevronDown size={14} className="text-slate-500" />
        }
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-2.5 rounded-lg text-sm text-white bg-white/3 border border-white/10 outline-none"
        style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
      />
    </div>
  )
}

function FuelTypeSelector({ value, onChange, label }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</label>
      <div role="radiogroup" className="grid grid-cols-4 gap-0 bg-navy-900/50 rounded-xl p-1 mt-1">
        {Object.entries(FUEL_LABELS).map(([k, l]) => {
          const isActive = value === k
          return (
            <button
              key={k}
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(k)}
              className="py-2 rounded-[9px] text-[11px] font-semibold transition"
              style={{
                background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
                color:      isActive ? '#50E5E5' : '#64748b',
              }}
            >{l}</button>
          )
        })}
      </div>
    </div>
  )
}

function MaintenanceField({ vehicle, onUpdate }) {
  const { t } = useSettings()
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[11px] text-slate-500 uppercase tracking-wider">
          {t('maintenance_label')}
        </label>
        <span className="text-[10px] text-slate-600">modifiable</span>
      </div>
      <div role="radiogroup" className="grid grid-cols-3 gap-0 bg-navy-900/50 rounded-xl p-1 mb-2">
        {MAINT_TIERS.map(tier => {
          const isActive = vehicle.tier === tier.k
          return (
            <button
              key={tier.k}
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                onUpdate('tier', tier.k)
                onUpdate('maint', getMaintDefault(vehicle.fuelType, tier.k))
                onUpdate('maintManual', false)
              }}
              className="py-1.5 rounded-[9px] text-[10px] font-semibold transition leading-tight"
              style={{
                background: isActive ? 'rgba(80,229,229,0.16)' : 'transparent',
                color:      isActive ? '#50E5E5' : '#64748b',
              }}
            >{tier.l}</button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="100"
          value={vehicle.maint}
          onChange={e => {
            onUpdate('maint', e.target.value)
            onUpdate('maintManual', true)
          }}
          aria-label="Entretien annuel"
          className="flex-1 px-3 py-2 rounded-lg text-sm text-amber-400 font-semibold border border-amber-400/20 bg-amber-400/5 outline-none text-center"
          style={{ fontFamily: 'inherit', MozAppearance: 'textfield' }}
        />
        <span className="text-xs text-slate-500">€/an</span>
      </div>
      <p className="text-[10px] text-slate-600 mt-1">
        Entretien + réparations estimés · ajustez selon votre expérience
      </p>
    </div>
  )
}
