import { useState } from 'react'
import { Key, Palette, Globe, Check, Monitor, Sun } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

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

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
  localStorage.setItem('theme', theme)
}

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const { language, currency, density, changeLanguage, changeCurrency, changeDensity, t } = useSettings()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('abu_api_key') || '')

  const handleTheme = (v) => {
    setTheme(v)
    applyTheme(v)
  }

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('abu_api_key', apiKey.trim())
    } else {
      localStorage.removeItem('abu_api_key')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">

      <Section icon={Key} title={t('settings_api_section')}>
        <Field label={t('settings_api_key_label')} description={t('settings_api_key_desc')}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full sm:w-64 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-slate-300 placeholder-slate-600
                       focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 transition"
          />
        </Field>
        <Field label={t('settings_api_power_label')} description={t('settings_api_power_desc')}>
          <select className="w-full sm:w-48 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option value="standard">{t('settings_standard')}</option>
            <option value="performance">{t('settings_performance')}</option>
            <option value="ultra">{t('settings_ultra')}</option>
          </select>
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                       bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                       hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all"
          >
            {saved ? <><Check size={14} /> {t('settings_saved')}</> : t('settings_save')}
          </button>
        </div>
      </Section>

      <Section icon={Palette} title={t('settings_appearance')}>
        <Field label={t('settings_theme_label')} description={t('settings_theme_desc')}>
          <div className="flex gap-2">
            <button
              onClick={() => handleTheme('dark')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                  : 'border-navy-600/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Monitor size={13} /> {t('settings_dark')}
            </button>
            <button
              onClick={() => handleTheme('light')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                  : 'border-navy-600/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sun size={13} /> {t('settings_light')}
            </button>
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
            className="w-full sm:w-36 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
          >
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CHF">CHF</option>
          </select>
        </Field>
        <Field label={t('settings_language_label')} description={t('settings_language_desc')}>
          <select
            value={language}
            onChange={e => changeLanguage(e.target.value)}
            className="w-full sm:w-36 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Field>
      </Section>
    </div>
  )
}
