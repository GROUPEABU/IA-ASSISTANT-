import { createContext, useContext, useState, useMemo, useLayoutEffect } from 'react'
import T from '@/i18n/translations'

const RATES = { EUR: 1, GBP: 0.855, CHF: 0.965 }
const SYMBOLS = { EUR: '€', GBP: '£', CHF: 'CHF ' }

const SettingsContext = createContext(null)

function applyDensity(d) {
  document.documentElement.setAttribute('data-density', d)
}

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || 'fr')
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'EUR')
  const [density, setDensityState] = useState(() => {
    const saved = localStorage.getItem('density') || 'normal'
    applyDensity(saved)
    return saved
  })

  // Use layout effect so density applies before first paint
  useLayoutEffect(() => { applyDensity(density) }, [density])

  const changeLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  const changeCurrency = (cur) => {
    setCurrency(cur)
    localStorage.setItem('currency', cur)
  }

  const changeDensity = (d) => {
    setDensityState(d)
    localStorage.setItem('density', d)
  }

  // Derive t and formatCurrency inside useMemo so they always have fresh language/currency
  const value = useMemo(() => {
    const t = (key) => T[language]?.[key] ?? T.fr[key] ?? key

    const numLocale = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES' }[language] || 'fr-FR'

    const formatCurrency = (amount, fromCurrency = 'EUR') => {
      if (!amount && amount !== 0) return '—'
      const inEur = fromCurrency === 'EUR' ? amount : amount / RATES[fromCurrency]
      const converted = Math.round(inEur * RATES[currency])
      if (currency === 'GBP') return `£${converted.toLocaleString('en-GB')}`
      if (currency === 'CHF') return `CHF ${converted.toLocaleString('de-CH')}`
      return `${converted.toLocaleString(numLocale)} €`
    }

    // Expose both `language` and `lang` so components can use either
    return { language, lang: language, currency, density, changeLanguage, changeCurrency, changeDensity, t, formatCurrency }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, currency, density])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
