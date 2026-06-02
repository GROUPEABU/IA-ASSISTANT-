import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'

// Plafond des fiches générées conservées par utilisateur. Au-delà, les plus
// anciennes sont évincées (FIFO) : évite la dérive silencieuse de localStorage
// et garde l'UI (raccourcis catalogue) lisible.
const MAX_GENERATED = 20

export function useGeneratedProducts() {
  const { user } = useAuth()
  const storageKey = ukey(user?.id ?? null, 'generated_products')

  const load = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  }, [storageKey])

  const [generated, setGenerated] = useState(load)

  // Reload when the active user changes (login / logout)
  useEffect(() => { setGenerated(load()) }, [load])

  const add = useCallback((product) => {
    setGenerated((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, MAX_GENERATED)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const remove = useCallback((id) => {
    setGenerated((prev) => {
      const next = prev.filter((p) => p.id !== id)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { generated, add, remove }
}
