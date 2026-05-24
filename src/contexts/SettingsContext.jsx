import { createContext, useContext, useState, useCallback, useEffect } from 'react'
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
  const [density, setDensityState] = useState(() => localStorage.getItem('density') || 'normal')

  useEffect(() => { applyDensity(density) }, [density])

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang)
    localStorage.setItem('lang', lang)
  }, [])

  const changeCurrency = useCallback((cur) => {
    setCurrency(cur)
    localStorage.setItem('currency', cur)
  }, [])

  const changeDensity = useCallback((d) => {
    setDensityState(d)
    localStorage.setItem('density', d)
  }, [])

  const t = useCallback((key) => {
    return T[language]?.[key] ?? T.fr[key] ?? key
  }, [language])

  const formatCurrency = useCallback((amount, fromCurrency = 'EUR') => {
    const inEur = fromCurrency === 'EUR' ? amount : amount / RATES[fromCurrency]
    const converted = inEur * RATES[currency]
    const sym = SYMBOLS[currency]
    return currency === 'EUR'
      ? `${Math.round(converted).toLocaleString('fr-FR')} €`
      : currency === 'GBP'
        ? `${sym}${Math.round(converted).toLocaleString('en-GB')}`
        : `${sym}${Math.round(converted).toLocaleString('de-CH')}`
  }, [currency])

  return (
    <SettingsContext.Provider value={{ language, currency, density, changeLanguage, changeCurrency, changeDensity, t, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
