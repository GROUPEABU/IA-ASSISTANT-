import { createContext, useContext, useState, useMemo, useLayoutEffect, useEffect } from 'react'
import T from '@/i18n/translations'
import { getItem, setItem } from '@/utils/userStorage'

const RATES = { EUR: 1, GBP: 0.855, CHF: 0.965 }

const SettingsContext = createContext(null)

function applyDensity(d) {
  document.documentElement.setAttribute('data-density', d)
}

/** userId prop injected by the SettingsShell bridge in App.jsx */
export function SettingsProvider({ children, userId = null }) {
  const [language, setLanguage]    = useState(() => getItem(userId, 'lang')     || 'fr')
  const [currency, setCurrency]    = useState(() => getItem(userId, 'currency') || 'EUR')
  const [density,  setDensityState] = useState(() => {
    const saved = getItem(userId, 'density') || 'normal'
    applyDensity(saved)
    return saved
  })

  // Reload all prefs when the active user changes (login / logout)
  useEffect(() => {
    const lang = getItem(userId, 'lang')     || 'fr'
    const cur  = getItem(userId, 'currency') || 'EUR'
    const den  = getItem(userId, 'density')  || 'normal'
    setLanguage(lang)
    setCurrency(cur)
    applyDensity(den)
    setDensityState(den)
  }, [userId])

  useLayoutEffect(() => { applyDensity(density) }, [density])

  const changeLanguage = (lang) => { setLanguage(lang); setItem(userId, 'lang', lang) }
  const changeCurrency = (cur)  => { setCurrency(cur);  setItem(userId, 'currency', cur) }
  const changeDensity  = (d)    => { setDensityState(d); setItem(userId, 'density', d); applyDensity(d) }

  const value = useMemo(() => {
    const t = (key) => T[language]?.[key] ?? T.fr[key] ?? key
    const numLocale = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES' }[language] || 'fr-FR'
    const formatCurrency = (amount, fromCurrency = 'EUR') => {
      if (!amount && amount !== 0) return '—'
      const inEur     = fromCurrency === 'EUR' ? amount : amount / RATES[fromCurrency]
      const converted = Math.round(inEur * RATES[currency])
      if (currency === 'GBP') return `£${converted.toLocaleString('en-GB')}`
      if (currency === 'CHF') return `CHF ${converted.toLocaleString('de-CH')}`
      return `${converted.toLocaleString(numLocale)} €`
    }
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
