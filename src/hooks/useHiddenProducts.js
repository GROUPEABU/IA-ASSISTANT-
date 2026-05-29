import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'

/**
 * Masquage persistant des fiches catalogue (statiques, ex: JAECOO).
 * On ne supprime pas les données source (catalogue codé en dur) ; on
 * mémorise les IDs masqués par utilisateur dans localStorage afin que la
 * suppression survive aux rechargements (« que cela ne revienne pas »).
 */
export function useHiddenProducts() {
  const { user } = useAuth()
  const storageKey = ukey(user?.id ?? null, 'hidden_products')

  const load = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  }, [storageKey])

  const [hidden, setHidden] = useState(load)

  useEffect(() => { setHidden(load()) }, [load])

  const hide = useCallback((id) => {
    setHidden((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const restore = useCallback((id) => {
    setHidden((prev) => {
      const next = id == null ? [] : prev.filter((x) => x !== id)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { hidden, hide, restore }
}
