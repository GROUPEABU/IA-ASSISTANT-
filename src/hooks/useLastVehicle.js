import { useCallback } from 'react'
import { ukey, getSessionUserId } from '@/utils/userStorage'

/**
 * Mémoire « dernier véhicule travaillé », partagée entre les outils.
 *
 * Quand l'utilisateur lance une recherche Veille Prix ou génère un pitch /
 * des objections, le nom du véhicule est mémorisé (localStorage par utilisateur).
 * Les autres outils peuvent alors préremplir leur champ véhicule au lieu de
 * forcer une nouvelle saisie. Aucune réactivité nécessaire : on lit la valeur
 * une seule fois à l'initialisation du champ.
 */
const keyFor = () => ukey(getSessionUserId(), 'last_vehicle')

/** Lecture directe (hors React) du dernier véhicule mémorisé. */
export function readLastVehicle() {
  try { return JSON.parse(localStorage.getItem(keyFor()) || 'null') } catch { return null }
}

/** Nom du dernier véhicule (chaîne vide si aucun) — pratique pour préremplir. */
export function readLastVehicleName() {
  return readLastVehicle()?.name || ''
}

export function useLastVehicle() {
  const save = useCallback((name) => {
    const clean = (name || '').trim()
    if (!clean) return
    try {
      localStorage.setItem(keyFor(), JSON.stringify({ name: clean, savedAt: Date.now() }))
    } catch {}
  }, [])

  return { save, read: readLastVehicle }
}
