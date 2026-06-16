import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'
import { cloudGet, cloudPut } from '@/utils/cloudStore'

// Plafond des fiches générées conservées par utilisateur. Au-delà, les plus
// anciennes sont évincées (FIFO) : évite la dérive silencieuse de localStorage
// et garde l'UI (raccourcis catalogue) lisible.
const MAX_GENERATED = 20
const CLOUD_KEY = 'generated_products'

// Union par id (les plus récentes d'abord côté local), dédupliquée.
const mergeById = (local, remote) => {
  const seen = new Set()
  const out = []
  for (const p of [...local, ...remote]) {
    if (!p || p.id == null || seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

export function useGeneratedProducts() {
  const { user } = useAuth()
  const storageKey = ukey(user?.id ?? null, 'generated_products')

  const load = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  }, [storageKey])

  const [generated, setGenerated] = useState(load)

  // Au montage / changement d'utilisateur : local immédiat puis fusion serveur.
  useEffect(() => {
    let alive = true
    const local = load()
    setGenerated(local)
    cloudGet(CLOUD_KEY).then((remote) => {
      if (!alive || remote === undefined) return // synchro indisponible
      const merged = mergeById(local, Array.isArray(remote) ? remote : []).slice(0, MAX_GENERATED)
      try { localStorage.setItem(storageKey, JSON.stringify(merged)) } catch {}
      setGenerated(merged)
      cloudPut(CLOUD_KEY, merged)
    })
    return () => { alive = false }
  }, [load, storageKey])

  const add = useCallback((product) => {
    setGenerated((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, MAX_GENERATED)
      localStorage.setItem(storageKey, JSON.stringify(next))
      cloudPut(CLOUD_KEY, next)
      return next
    })
  }, [storageKey])

  const remove = useCallback((id) => {
    setGenerated((prev) => {
      const next = prev.filter((p) => p.id !== id)
      localStorage.setItem(storageKey, JSON.stringify(next))
      cloudPut(CLOUD_KEY, next)
      return next
    })
  }, [storageKey])

  return { generated, add, remove }
}
