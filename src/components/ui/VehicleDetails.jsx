import { useSettings } from '@/contexts/SettingsContext'

/**
 * Champs « détails véhicule » partagés (Pitch, Objections) — mêmes cases que la
 * Veille Prix pour préciser le contexte et améliorer la pertinence de l'IA.
 * Tous les champs sont OPTIONNELS.
 */

export const EMPTY_DETAILS = { type: '', fuel: '', gearbox: '', annee: '', km: '', finition: '' }

const FUEL_FR = { ES: 'Essence', GO: 'Diesel', EL: 'Électrique', HY: 'Hybride', GH: 'Hybride rechargeable', GP: 'GPL' }
const GEAR_FR = { M: 'Boîte manuelle', A: 'Boîte automatique' }

/** Construit un descriptif court pour le prompt, en n'incluant que les champs remplis. */
export function formatVehicleDetails(d) {
  if (!d) return ''
  const parts = []
  if (d.type) parts.push(d.type === 'vn' ? 'Véhicule neuf (VN)' : "Véhicule d'occasion (VO)")
  if (FUEL_FR[d.fuel]) parts.push(FUEL_FR[d.fuel])
  if (GEAR_FR[d.gearbox]) parts.push(GEAR_FR[d.gearbox])
  if (d.annee) parts.push(`année ${d.annee}`)
  if (d.km) parts.push(`${d.km} km`)
  if (d.finition) parts.push(`finition ${d.finition}`)
  return parts.join(' · ')
}

const selectCls = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition'
const inputCls  = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition'

// Défini AU NIVEAU MODULE (jamais dans le rendu) : sinon React recrée le type à
// chaque frappe, démonte/remonte le champ et le focus saute.
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function VehicleDetails({ value, onChange }) {
  const { t } = useSettings()
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })

  return (
    <div className="mb-4">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
        {t('veh_details_title')}
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Field label={t('veh_type_label')}>
          <select value={value.type} onChange={set('type')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            <option value="vo">{t('used_vehicle')}</option>
            <option value="vn">{t('new_vehicle')}</option>
          </select>
        </Field>
        <Field label={t('fuel_label')}>
          <select value={value.fuel} onChange={set('fuel')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            <option value="ES">{t('price_fuel_petrol')}</option>
            <option value="GO">{t('price_fuel_diesel')}</option>
            <option value="EL">{t('price_fuel_electric')}</option>
            <option value="HY">{t('price_fuel_hybrid')}</option>
            <option value="GH">{t('price_fuel_phev')}</option>
            <option value="GP">{t('price_fuel_lpg')}</option>
          </select>
        </Field>
        <Field label={t('gearbox_label')}>
          <select value={value.gearbox} onChange={set('gearbox')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            <option value="M">{t('price_gearbox_manual')}</option>
            <option value="A">{t('price_gearbox_auto')}</option>
          </select>
        </Field>
        <Field label={t('veh_year_label')}>
          <input type="text" inputMode="numeric" value={value.annee} onChange={set('annee')} placeholder="2023" className={inputCls} />
        </Field>
        <Field label={t('km_max')}>
          <input type="text" inputMode="numeric" value={value.km} onChange={set('km')} placeholder="45 000" className={inputCls} />
        </Field>
        <Field label={t('price_finition_label')}>
          <input type="text" value={value.finition} onChange={set('finition')} placeholder={t('price_finition_ph')} className={inputCls} />
        </Field>
      </div>
    </div>
  )
}
