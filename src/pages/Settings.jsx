import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Key, Palette, Globe, Check, Monitor, Sun, Laptop, Scale, ChevronRight, Wifi, BarChart2, RotateCcw, Info } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'
import { getCosts, resetCosts } from '@/utils/apiCost'
import { getSpend, MONTHLY_CAP, DAILY_CAP, migrateToQuota } from '@/utils/spendTracker'

const Section = ({ icon: Icon, title, children }) => (
  <div className="glass-card overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50 bg-navy-900/20">
      <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-cyan-400" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    <div className="p-5 space-y-5">
      {children}
    </div>
  </div>
)

const Field = ({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <div className="flex-shrink-0 w-full sm:w-auto">{children}</div>
  </div>
)

const DENSITY_OPTIONS = [
  { key: 'compact', label: 'Compact' },
  { key: 'normal',  label: 'Normal' },
  { key: 'large',   label: 'Large' },
]

const TOOL_LABELS = {
  veilleprix:        'Veille Prix',
  ficheIA:           'Fiche IA',
  analysemarche:     'Analyse marché',
  comparateur:       'Comparateur',
  objections:        'Objections',
  pitch:             'Pitch',
  rapportcommercial: 'Rapport commercial',
  analysestock:      'Analyse de stock',
  importsmart:       'Import intelligent',
  logistique:        'Logistique',
  chat:              'Chat assistant',
}

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const { language, currency, density, changeLanguage, changeCurrency, changeDensity, t } = useSettings()
  const { user } = useAuth()
  const [costs, setCosts] = useState(() => getCosts())
  const [spend, setSpend] = useState(() => user?.id != null ? getSpend(user.id) : { month: 0, day: 0 })
  const themeKey    = ukey(user?.id ?? null, 'theme')
  const aiPowerKey  = ukey(user?.id ?? null, 'ai_power')
  const [theme,      setTheme]      = useState(() => localStorage.getItem(themeKey)   || 'dark')
  const [aiPower,    setAiPower]    = useState(() => localStorage.getItem(aiPowerKey) || 'performance')

  // Défilement vers la section « Utilisation API » quand on arrive via la jauge
  // de la sidebar (lien /settings#usage), avec un bref surlignage.
  const location  = useLocation()
  const usageRef  = useRef(null)
  const [usageHighlight, setUsageHighlight] = useState(false)
  useEffect(() => {
    if (location.hash !== '#usage' || !usageRef.current) return
    usageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setUsageHighlight(true)
    const id = setTimeout(() => setUsageHighlight(false), 1600)
    return () => clearTimeout(id)
  }, [location.hash])

  // Migration one-shot : si des coûts historiques existent mais que les jauges
  // mois/jour sont à 0, on injecte le total dans le quota courant.
  useEffect(() => {
    if (user?.id == null) return
    const entries = Object.entries(costs).filter(([, v]) => v.cost > 0)
    const legacy  = entries.reduce((s, [, v]) => s + v.cost, 0)
    if (legacy > 0) {
      migrateToQuota(user.id, legacy)
      setSpend(getSpend(user.id))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function applyThemeValue(v) {
    if (v === 'light') {
      document.documentElement.classList.add('light')
    } else if (v === 'dark') {
      document.documentElement.classList.remove('light')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) document.documentElement.classList.remove('light')
      else document.documentElement.classList.add('light')
    }
  }

  const handleTheme = (v) => {
    setTheme(v)
    applyThemeValue(v)
    localStorage.setItem(themeKey, v)
  }

  // Follow OS changes when theme = 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeValue('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const handleSave = () => {
    localStorage.setItem(aiPowerKey, aiPower)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="w-full max-w-5xl animate-fade-in">
      {/* Row 1: API — full width */}
      <Section icon={Key} title={t('settings_api_section')}>
        <div className="space-y-5">
          {/* API key — statut connexion (champ masqué, clé gérée côté serveur) */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
            <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
              <Wifi size={14} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">{t('settings_api_key_label')}</p>
              <p className="text-xs text-emerald-400 mt-0.5">{t('settings_api_connected')}</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
          </div>

          {/* Power + Save — second row, aligned */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-1 border-t border-navy-700/40">
            <div className="flex-1 pt-4">
              <p className="text-sm font-medium text-slate-200">{t('settings_api_power_label')}</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-2 leading-relaxed">{t('settings_api_power_desc')}</p>
              <select
                value={aiPower}
                onChange={e => setAiPower(e.target.value)}
                className="w-full sm:w-64 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                           text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
                <option value="standard">{t('settings_standard')}</option>
                <option value="performance">{t('settings_performance')}</option>
                <option value="ultra">{t('settings_ultra')}</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all flex-shrink-0"
            >
              {saved ? <><Check size={14} /> {t('settings_saved')}</> : t('settings_save')}
            </button>
          </div>
        </div>
      </Section>

      {/* Row 2: Appearance + Data side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Section icon={Palette} title={t('settings_appearance')}>
          <Field label={t('settings_theme_label')} description={t('settings_theme_desc')}>
            <div className="flex gap-2">
              {[
                { value: 'dark',   icon: Monitor, labelKey: 'settings_dark' },
                { value: 'light',  icon: Sun,     labelKey: 'settings_light' },
                { value: 'system', icon: Laptop,  labelKey: 'settings_system' },
              ].map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    theme === value
                      ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                      : 'border-navy-600/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} /> {t(labelKey)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('settings_density_label')} description={t('settings_density_desc')}>
            <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl border border-navy-700/40">
              {DENSITY_OPTIONS.map(({ key }) => (
                <button
                  key={key}
                  onClick={() => changeDensity(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    density === key
                      ? 'bg-cyan-400/15 text-cyan-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t(`settings_${key}`)}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section icon={Globe} title={t('settings_data')}>
          <Field label={t('settings_currency_label')} description={t('settings_currency_desc')}>
            <select
              value={currency}
              onChange={e => changeCurrency(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">{t('currency_gbp')}</option>
              <option value="CHF">{t('currency_chf')}</option>
            </select>
          </Field>
          <Field label={t('settings_language_label')} description={t('settings_language_desc')}>
            <select
              value={language}
              onChange={e => changeLanguage(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
        </Section>
      </div>

      {/* Row 3: API cost counter + quota */}
      <div
        id="usage"
        ref={usageRef}
        className={`mt-4 scroll-mt-20 rounded-2xl transition-shadow duration-500 ${
          usageHighlight ? 'ring-2 ring-cyan-400/40' : ''
        }`}
      >
        <Section icon={BarChart2} title={t('settings_cost_section')}>
          {/* Quota gauges — toujours visibles */}
          <div className="space-y-3 pb-3 border-b border-navy-700/40">
            {[
              { label: t('settings_quota_month'), spent: spend.month, cap: MONTHLY_CAP, resetNote: t('settings_quota_reset_month') },
              { label: t('settings_quota_day'),   spent: spend.day,   cap: DAILY_CAP,   resetNote: t('settings_quota_reset_day')   },
            ].map(({ label, spent, cap, resetNote }) => {
              const pct     = Math.min(100, (spent / cap) * 100)
              const reached = spent >= cap
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300">{label}</span>
                    <span className={`text-xs font-mono tabular-nums ${reached ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                      €{spent.toFixed(2)} / €{cap}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-navy-700/50">
                    <div
                      className={`h-1.5 rounded-full transition-all ${reached ? 'bg-red-400' : pct > 75 ? 'bg-warn/70' : 'bg-cyan-400/70'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{resetNote}</p>
                </div>
              )
            })}
          </div>
          {(() => {
            const entries = Object.entries(costs).filter(([, v]) => v.cost > 0)
            const total = entries.reduce((s, [, v]) => s + v.cost, 0)
            return entries.length === 0 ? (
              <p className="text-xs text-slate-500">{t('settings_cost_empty')}</p>
            ) : (
              <>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500">{t('settings_cost_total')}</p>
                    <p className="text-2xl font-bold text-white">€{total.toFixed(3)}</p>
                    <p className="text-[10px] text-slate-600">{t('settings_cost_since')}</p>
                  </div>
                  <button
                    onClick={() => { resetCosts(); setCosts({}) }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 border border-navy-600/50
                               px-3 py-1.5 rounded-lg hover:text-slate-300 hover:border-navy-500 transition"
                  >
                    <RotateCcw size={11} /> {t('settings_cost_reset')}
                  </button>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('settings_cost_breakdown')}</p>
                <div className="space-y-1.5">
                  {entries.sort((a, b) => b[1].cost - a[1].cost).map(([tool, v]) => {
                    const pct = total > 0 ? (v.cost / total) * 100 : 0
                    return (
                      <div key={tool}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-300">{TOOL_LABELS[tool] || tool}</span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            €{v.cost.toFixed(3)} · {v.calls} {v.calls > 1 ? t('settings_cost_calls') : t('settings_cost_call')} · {Math.round(pct)} %
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-navy-700/50">
                          <div className="h-1 rounded-full bg-cyan-400/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-start gap-1.5 mt-3">
                  <Info size={11} className="text-slate-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">{t('settings_cost_disclaimer')}</p>
                </div>
              </>
            )
          })()}
        </Section>
      </div>

      {/* Row 4: Legal — full width */}
      <div className="mt-4">
        <Section icon={Scale} title={t('settings_legal_section')}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {[
              { to: '/mentions-legales',          labelKey: 'legal_mentions',  descKey: 'settings_legal_mentions_desc' },
              { to: '/politique-confidentialite',  labelKey: 'legal_privacy',   descKey: 'settings_legal_privacy_desc' },
              { to: '/conditions-utilisation',     labelKey: 'legal_cgu',       descKey: 'settings_legal_cgu_desc' },
            ].map(({ to, labelKey, descKey }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between gap-3 py-3 px-3 rounded-xl
                           border border-white/5 hover:border-cyan-400/20 hover:bg-white/3 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition">{t(labelKey)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(descKey)}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition flex-shrink-0" />
              </Link>
            ))}
          </div>
        </Section>
      </div>

      {/* Marqueur de build — vérifie que l'appareil charge la dernière version */}
      <p className="text-[10px] text-slate-600 text-center mt-4">
        Build {typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '—'}
      </p>
    </div>
  )
}
