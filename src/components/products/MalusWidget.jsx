import { useState } from 'react'
import { getMalus, getMalusColor, getMalusLabel } from '@/utils/malus'
import { formatNumber } from '@/utils/formatters'
import { useSettings } from '@/contexts/SettingsContext'
import { getCountryName } from '@/utils/malusLabels'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

const COUNTRIES_WIDGET = [
  { code: 'FR', flag: '🇫🇷', note: 'Barème 2025 WLTP' },
  { code: 'BE', flag: '🇧🇪', note: 'Taxe CO₂ régionale' },
  { code: 'ES', flag: '🇪🇸', note: 'Impuesto matriculación' },
  { code: 'DE', flag: '🇩🇪', note: 'KFZ-Steuer' },
  { code: 'IT', flag: '🇮🇹', note: 'Ecotassa' },
  { code: 'NL', flag: '🇳🇱', note: 'BPM CO₂' },
]

function estimateForeignMalus(co2, country) {
  const base = getMalus(co2)
  const multipliers = { FR: 1, BE: 0.6, ES: 0.8, DE: 0.4, IT: 1.2, NL: 1.5 }
  return Math.round(base * (multipliers[country] ?? 1))
}

export default function MalusWidget({ product }) {
  const { t, lang } = useSettings()
  const [prix, setPrix] = useState(product.prix.base)
  const co2 = product.specs.co2_wltp
  const malus = getMalus(co2, prix)
  const mc = getMalusColor(co2)
  const ml = getMalusLabel(co2)
  const totalAcheteur = prix + malus

  const colorClass = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    orange: 'text-orange-400',
    danger: 'text-red-400',
  }[mc]

  const bgClass = {
    success: 'bg-emerald-400/10 border-emerald-400/20',
    warning: 'bg-amber-400/10 border-amber-400/20',
    orange: 'bg-orange-400/10 border-orange-400/20',
    danger: 'bg-red-400/10 border-red-400/20',
  }[mc]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* CO2 Badge principal */}
      <div className={`glass-card p-5 border ${bgClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">{t('malus_co2_wltp_label')}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${colorClass}`}>{co2}</span>
              <span className="text-lg text-slate-400">g/km</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {mc === 'success'
                ? <CheckCircle size={14} className="text-emerald-400" />
                : <AlertTriangle size={14} className={colorClass} />}
              <span className={`text-sm font-semibold ${colorClass}`}>{ml}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">{t('malus_fr_2025_label')}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>
              {malus > 0 ? `+${formatNumber(malus)} €` : t('malus_exempt_label')}
            </p>
            <p className="text-xs text-slate-500 mt-1">{t('malus_cap_60_label')}</p>
          </div>
        </div>
      </div>

      {/* Simulateur prix */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4">
          {t('malus_simulator_title')}
        </h3>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-slate-400">{t('malus_price_ttc')}</label>
            <span className="text-sm font-bold text-white">{formatNumber(prix)} €</span>
          </div>
          <input
            type="range"
            min={product.prix.base}
            max={product.prix.haut}
            step={500}
            value={prix}
            onChange={(e) => setPrix(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>{formatNumber(product.prix.base)} €</span>
            <span>{formatNumber(product.prix.haut)} €</span>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-navy-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('malus_vehicle_price')}</span>
            <span className="text-white font-medium">{formatNumber(prix)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('malus_eco_label')}</span>
            <span className={`font-medium ${colorClass}`}>+{formatNumber(malus)} €</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-navy-700/30">
            <span className="text-white font-semibold">{t('malus_total_buyer')}</span>
            <span className="text-cyan-400 font-bold text-base">{formatNumber(totalAcheteur)} €</span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-navy-900/40 flex gap-2">
          <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('malus_cap_note')}
          </p>
        </div>
      </div>

      {/* Comparatif pays */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            {t('malus_eu_tax_title')}
          </h3>
          <a
            href="https://co2-malus.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:underline"
          >
            {t('malus_see_countries_link')}
          </a>
        </div>

        <div className="space-y-2">
          {COUNTRIES_WIDGET.map(({ code, flag, note }) => {
            const name = getCountryName(code, lang) || code
            const m = estimateForeignMalus(co2, code)
            return (
              <div key={code} className="flex items-center gap-3">
                <span className="text-base flex-shrink-0">{flag}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-300">{name}</p>
                  <p className="text-[10px] text-slate-600">{note}</p>
                </div>
                <span className={`text-xs font-bold ${m > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {m > 0 ? `~${formatNumber(m)} €` : t('malus_exempt_label')}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-600 mt-3">
          {t('malus_approx_note')}
        </p>
      </div>
    </div>
  )
}
