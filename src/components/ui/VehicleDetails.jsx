import { useSettings } from '@/contexts/SettingsContext'
import {
  MAKES, YEARS, MILEAGE_MIN_VALUES, MILEAGE_MAX_VALUES,
  FUEL_OPTS, GEARBOX_OPTS, BODY_OPTS, FUEL_FR, GEAR_FR, BODY_FR,
} from '@/data/vehicleFilters'

/**
 * Filtres véhicule partagés (Pitch, Objections, Fiche IA) — EXACTEMENT les mêmes
 * champs que la Veille Prix (hors pays/marché) : Type, Marque, Modèle, Finition,
 * Carrosserie, Année min/max, Km min/max, Carburant, Boîte. Tous OPTIONNELS.
 */

export const EMPTY_DETAILS = {
  type: '', make: '', model: '', finition: '', carrosserie: '',
  yearMin: '', yearMax: '', mileageMin: '', mileageMax: '', fuel: '', gearbox: '',
}

/** Nom commercial = marque + modèle (ce qu'on envoie comme libellé véhicule). */
export function vehicleNameOf(d) {
  return [d?.make, d?.model].filter(Boolean).join(' ').trim()
}

/** Construit un descriptif court pour le prompt, en n'incluant que les champs remplis. */
export function formatVehicleDetails(d) {
  if (!d) return ''
  const parts = []
  if (d.type) parts.push(d.type === 'vn' ? 'Véhicule neuf (VN)' : "Véhicule d'occasion (VO)")
  if (d.finition) parts.push(`finition ${d.finition}`)
  if (BODY_FR[d.carrosserie]) parts.push(BODY_FR[d.carrosserie])
  if (FUEL_FR[d.fuel]) parts.push(FUEL_FR[d.fuel])
  if (GEAR_FR[d.gearbox]) parts.push(GEAR_FR[d.gearbox])
  if (d.yearMin && d.yearMax) parts.push(d.yearMin === d.yearMax ? `millésime ${d.yearMin}` : `millésimes ${d.yearMin}–${d.yearMax}`)
  else if (d.yearMin) parts.push(`à partir de ${d.yearMin}`)
  else if (d.yearMax) parts.push(`jusqu'à ${d.yearMax}`)
  const km = (n) => Number(n).toLocaleString('fr-FR')
  if (d.mileageMin && d.mileageMax) parts.push(`${km(d.mileageMin)}–${km(d.mileageMax)} km`)
  else if (d.mileageMin) parts.push(`≥ ${km(d.mileageMin)} km`)
  else if (d.mileageMax) parts.push(`≤ ${km(d.mileageMax)} km`)
  return parts.join(' · ')
}

const selectCls = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition'
const inputCls  = 'w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition'

// Défini AU NIVEAU MODULE (jamais dans le rendu) : sinon React recrée le type à
// chaque frappe, démonte/remonte le champ et le focus saute.
// flex-col + min-h sur le label + mt-auto sur le champ : les contrôles restent
// alignés sur une même ligne même quand un libellé passe sur deux lignes.
function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 leading-tight min-h-[2.2em]">{label}</label>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

export default function VehicleDetails({ value, onChange }) {
  const { t } = useSettings()
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const km = (n) => Number(n).toLocaleString('fr-FR')

  return (
    <div className="mb-4">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
        {t('veh_details_title')}
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <Field label={t('make_label')}>
          <input type="text" value={value.make} onChange={set('make')} list="veh-makes-list"
            placeholder={t('make_ph')} aria-label={t('make_label')} className={inputCls} />
          <datalist id="veh-makes-list">{MAKES.map(m => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label={t('model_label')}>
          <input type="text" value={value.model} onChange={set('model')}
            placeholder={t('price_model_ph')} aria-label={t('model_label')} className={inputCls} />
        </Field>
        <Field label={t('price_finition_label')}>
          <input type="text" value={value.finition} onChange={set('finition')}
            placeholder={t('price_finition_ph')} className={inputCls} />
        </Field>
        <Field label={t('veh_type_label')}>
          <select value={value.type} onChange={set('type')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            <option value="vo">{t('used_vehicle')}</option>
            <option value="vn">{t('new_vehicle')}</option>
          </select>
        </Field>
        <Field label={t('price_body_label')}>
          <select value={value.carrosserie} onChange={set('carrosserie')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            {BODY_OPTS.map(b => <option key={b.code} value={b.code}>{t(b.key)}</option>)}
          </select>
        </Field>
        <Field label={t('fuel_label')}>
          <select value={value.fuel} onChange={set('fuel')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            {FUEL_OPTS.map(f => <option key={f.code} value={f.code}>{t(f.key)}</option>)}
          </select>
        </Field>
        <Field label={t('gearbox_label')}>
          <select value={value.gearbox} onChange={set('gearbox')} className={selectCls}>
            <option value="">{t('veh_any')}</option>
            {GEARBOX_OPTS.map(g => <option key={g.code} value={g.code}>{t(g.key)}</option>)}
          </select>
        </Field>
        <Field label={t('year_min')}>
          <select value={value.yearMin} onChange={set('yearMin')} className={selectCls}>
            <option value="">{t('year_min')}</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label={t('year_max')}>
          <select value={value.yearMax} onChange={set('yearMax')} className={selectCls}>
            <option value="">{t('year_max')}</option>
            {YEARS.filter(y => !value.yearMin || y >= Number(value.yearMin)).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label={t('km_min')}>
          <select value={value.mileageMin} onChange={set('mileageMin')} className={selectCls}>
            <option value="">{t('km_min')}</option>
            {MILEAGE_MIN_VALUES.map(v => <option key={v} value={v}>≥ {km(v)} km</option>)}
          </select>
        </Field>
        <Field label={t('km_max')}>
          <select value={value.mileageMax} onChange={set('mileageMax')} className={selectCls}>
            <option value="">{t('km_max')}</option>
            {MILEAGE_MAX_VALUES.map(v => <option key={v} value={v}>&lt; {km(v)} km</option>)}
          </select>
        </Field>
      </div>
    </div>
  )
}
