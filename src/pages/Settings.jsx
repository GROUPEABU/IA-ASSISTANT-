import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Key, Palette, Globe, Check, Monitor, Sun, Laptop, Scale, ChevronRight, Copy } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'

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

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const { language, currency, density, changeLanguage, changeCurrency, changeDensity, t } = useSettings()
  const { user } = useAuth()
  const themeKey    = ukey(user?.id ?? null, 'theme')
  const apiKeyKey   = ukey(user?.id ?? null, 'api_key')
  const aiPowerKey  = ukey(user?.id ?? null, 'ai_power')
  const [theme,      setTheme]      = useState(() => localStorage.getItem(themeKey)   || 'dark')
  const [apiKey,     setApiKey]     = useState(() => localStorage.getItem(apiKeyKey)  || '')
  const [aiPower,    setAiPower]    = useState(() => localStorage.getItem(aiPowerKey) || 'performance')
  const [keyCopied,  setKeyCopied]  = useState(false)

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
    if (apiKey.trim()) {
      localStorage.setItem(apiKeyKey, apiKey.trim())
    } else {
      localStorage.removeItem(apiKeyKey)
    }
    localStorage.setItem(aiPowerKey, aiPower)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="w-full max-w-5xl animate-fade-in">
      {/* Row 1: API — full width */}
      <Section icon={Key} title={t('settings_api_section')}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Field label={t('settings_api_key_label')} description={t('settings_api_key_desc')}>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                           text-sm text-slate-300 placeholder-slate-600
                           focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 transition"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey)
                    setKeyCopied(true)
                    setTimeout(() => setKeyCopied(false), 2000)
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-navy-700/50
                             text-xs font-medium text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition flex-shrink-0"
                >
                  {keyCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {keyCopied ? t('api_key_copied') : t('api_key_copy')}
                </button>
              )}
            </div>
          </Field>
          <Field label={t('settings_api_power_label')} description={t('settings_api_power_desc')}>
            <select
              value={aiPower}
              onChange={e => setAiPower(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
              <option value="standard">{t('settings_standard')}</option>
              <option value="performance">{t('settings_performance')}</option>
              <option value="ultra">{t('settings_ultra')}</option>
            </select>
          </Field>
          <div className="flex items-end justify-start lg:justify-end pb-0.5">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all"
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

      {/* Row 3: Legal — full width */}
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
    </div>
  )
}
