import { useState, useCallback, useMemo } from 'react'
import { emptyVehicle, getMaintDefault, COLORS } from '../constants'
import { calcTco } from '../calculations'

const MAX_VEHICLES = 4

/**
 * Hook managing the list of TCO vehicles and producing sorted results.
 *
 * Vehicles are kept in an array; updates use functional setState to avoid
 * stale-closure bugs. Maintenance values auto-derive from tier/fuelType
 * unless the user has explicitly typed a custom value (maintManual flag).
 *
 * @param {object} globals { years, kmYear, fuelPrice, elecPrice }
 */
export function useTcoVehicles(globals) {
  const [vehicles, setVehicles] = useState(() => [emptyVehicle(1), emptyVehicle(2)])

  const update = useCallback((id, field, value) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== id) return v
      const next = { ...v, [field]: value }
      // Auto-recompute maintenance when tier/fuelType changes (unless user-overridden)
      if ((field === 'tier' || field === 'fuelType') && !v.maintManual) {
        next.maint = getMaintDefault(next.fuelType, next.tier)
      }
      return next
    }))
  }, [])

  const add = useCallback(() => {
    setVehicles(prev => {
      if (prev.length >= MAX_VEHICLES) return prev
      const id = Math.max(...prev.map(v => v.id)) + 1
      return [...prev, { ...emptyVehicle(id), maint: getMaintDefault('thermique', 'mid') }]
    })
  }, [])

  const remove = useCallback((id) => {
    setVehicles(prev => prev.filter(v => v.id !== id))
  }, [])

  const toggleOpen = useCallback((id) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, open: !v.open } : v))
  }, [])

  // Vehicles with maintenance defaults filled in for display
  const vehiclesWithMaint = useMemo(
    () => vehicles.map(v => ({
      ...v,
      maint: v.maint !== '' ? v.maint : getMaintDefault(v.fuelType, v.tier),
    })),
    [vehicles],
  )

  // Computed results, sorted by total ascending
  const results = useMemo(() => {
    return vehiclesWithMaint
      .filter(v => v.nom && Number(v.prix) > 0)
      .map((v, i) => {
        const breakdown = calcTco({
          prix: v.prix, co2: v.co2, fuelType: v.fuelType,
          conso: v.conso, maint: v.maint,
          ...globals,
        })
        return {
          nom: v.nom,
          prix: Number(v.prix),
          ...breakdown,
          color: COLORS[i % COLORS.length],
        }
      })
      .sort((a, b) => a.total - b.total)
  }, [vehiclesWithMaint, globals])

  return {
    vehicles: vehiclesWithMaint,
    canAdd: vehicles.length < MAX_VEHICLES,
    canRemove: vehicles.length > 1,
    update,
    add,
    remove,
    toggleOpen,
    results,
  }
}
