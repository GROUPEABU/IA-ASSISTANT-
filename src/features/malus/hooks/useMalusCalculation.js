import { useState, useEffect, useMemo, useCallback } from 'react'
import { buildCountryData } from '@/utils/malusWorld'
import { localizeResult } from '@/utils/malusLabels'
import { useSettings } from '@/contexts/SettingsContext'
import { MAX_COMPARE } from '../constants'

/**
 * Hook encapsulating all malus calculation logic.
 *
 * Manages:
 *  - Input state (emission, weight, fuel type, date, etc.)
 *  - Single-country result (selectedCountry + result)
 *  - Compare-mode results (selectedForCompare + compareResults)
 *
 * The hook is parametrized by all input state setters so the consuming
 * component remains in control of its UI rendering decisions while the
 * heavy `buildCountryData` calls are isolated here.
 */
export function useMalusCalculation() {
  const { lang } = useSettings()

  // ── Input state ─────────────────────────────────────────────────────────
  const [emission, setEmission]           = useState(143)
  const [weight, setWeight]               = useState(1450)
  const [fuelType, setFuelType]           = useState('thermique')
  const [dateImmat, setDateImmat]         = useState('2025-03-12')
  const [isImported, setIsImported]       = useState(false)
  const [displacement, setDisplacement]   = useState(1300)
  const [vehiclePrice, setVehiclePrice]   = useState(30000)
  const [fuelKind, setFuelKind]           = useState('petrol')
  const [beRegion, setBeRegion]           = useState('wallonie')
  const [esRegion, setEsRegion]           = useState('standard')
  const [childrenCount, setChildrenCount] = useState(0)

  // ── Single-country result ───────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [result, setResult]                   = useState(null)

  // ── Compare-mode state ──────────────────────────────────────────────────
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [compareResults, setCompareResults]         = useState([])

  // Bundled "extra" parameters passed to buildCountryData
  const extra = useMemo(
    () => ({ displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount }),
    [displacement, vehiclePrice, fuelKind, beRegion, esRegion, childrenCount],
  )

  // Recompute single-country result whenever inputs or selection change
  useEffect(() => {
    if (!selectedCountry) return
    const data = buildCountryData(selectedCountry.code, emission, weight, fuelType, dateImmat, isImported, extra)
    const raw = data ? { ...data, country: selectedCountry } : null
    setResult(raw ? localizeResult(raw, lang) : null)
  }, [emission, weight, fuelType, dateImmat, isImported, selectedCountry, extra, lang])

  // Recompute compare results whenever inputs or selection change
  useEffect(() => {
    if (selectedForCompare.length < 2) return
    const next = selectedForCompare
      .map(c => {
        const d = buildCountryData(c.code, emission, weight, fuelType, dateImmat, isImported, extra)
        return d ? localizeResult({ ...d, country: c }, lang) : null
      })
      .filter(Boolean)
    setCompareResults(next)
  }, [emission, weight, fuelType, dateImmat, isImported, selectedForCompare, extra, lang])

  const selectCountry = useCallback((country) => {
    setSelectedCountry(country)
  }, [])

  const toggleCompareCountry = useCallback((country) => {
    setSelectedForCompare(prev => {
      if (prev.find(x => x.code === country.code)) {
        return prev.filter(x => x.code !== country.code)
      }
      return prev.length < MAX_COMPARE ? [...prev, country] : prev
    })
  }, [])

  const reset = useCallback(() => {
    setEmission(143)
    setWeight(1450)
    setFuelType('thermique')
    setDateImmat('2025-03-12')
    setIsImported(false)
    setDisplacement(1300)
    setVehiclePrice(30000)
    setFuelKind('petrol')
    setBeRegion('wallonie')
    setEsRegion('standard')
    setChildrenCount(0)
    setSelectedCountry(null)
    setResult(null)
    setSelectedForCompare([])
    setCompareResults([])
  }, [])

  const runManualCompare = useCallback(() => {
    const next = selectedForCompare
      .map(c => {
        const d = buildCountryData(c.code, emission, weight, fuelType, dateImmat, isImported, extra)
        return d ? localizeResult({ ...d, country: c }, lang) : null
      })
      .filter(Boolean)
    setCompareResults(next)
  }, [emission, weight, fuelType, dateImmat, isImported, selectedForCompare, extra, lang])

  return {
    // input state + setters
    emission, setEmission,
    weight, setWeight,
    fuelType, setFuelType,
    dateImmat, setDateImmat,
    isImported, setIsImported,
    displacement, setDisplacement,
    vehiclePrice, setVehiclePrice,
    fuelKind, setFuelKind,
    beRegion, setBeRegion,
    esRegion, setEsRegion,
    childrenCount, setChildrenCount,
    reset,
    // results
    selectedCountry, selectCountry,
    result,
    selectedForCompare, toggleCompareCountry,
    compareResults, runManualCompare,
  }
}
