import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'
import { cloudGet, cloudPut } from '@/utils/cloudStore'

const MAX_GENERATED = 20
const CLOUD_KEY = 'generated_products'
const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000

const pruneTombstones = (arr) => {
  const cutoff = Date.now() - TOMBSTONE_TTL
  return arr.filter((p) => !p._tombstone || p.deletedAt > cutoff)
}

// Fusion : tombstone > item vivant ; local prime en cas d'égalité.
const mergeById = (local, remote) => {
  const map = new Map()
  for (const p of [...remote, ...local]) {
    if (!p || p.id == null) continue
    const ex = map.get(p.id)
    if (!ex) { map.set(p.id, p); continue }
    if (p._tombstone && !ex._tombstone) { map.set(p.id, p); continue }
    if (!p._tombstone && ex._tombstone) continue
    if (p._tombstone) {
      if (p.deletedAt >= ex.deletedAt) map.set(p.id, p)
    } else {
      map.set(p.id, p) // local prime
    }
  }
  return [...map.values()]
}

export function useGeneratedProducts() {
  const { user } = useAuth()
  const storageKey = ukey(user?.id ?? null, 'generated_products')

  const loadFull = useCallback(() => {
    try { return pruneTombstones(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { return [] }
  }, [storageKey])

  const [generated, setGenerated] = useState(() =>
    loadFull().filter((p) => !p._tombstone).slice(0, MAX_GENERATED)
  )

  // Au montage : local immédiat puis fusion serveur.
  useEffect(() => {
    let alive = true
    const local = loadFull()
    setGenerated(local.filter((p) => !p._tombstone).slice(0, MAX_GENERATED))
    cloudGet(CLOUD_KEY).then((remote) => {
      if (!alive || remote === undefined) return
      const merged = pruneTombstones(mergeById(local, Array.isArray(remote) ? remote : []))
      try { localStorage.setItem(storageKey, JSON.stringify(merged)) } catch {}
      if (alive) setGenerated(merged.filter((p) => !p._tombstone).slice(0, MAX_GENERATED))
      cloudPut(CLOUD_KEY, merged)
    })
    return () => { alive = false }
  }, [loadFull, storageKey])

  const add = useCallback((product) => {
    setGenerated(() => {
      // Retire le tombstone éventuel pour cet id avant de ré-ajouter
      const full = loadFull().filter((p) => p.id !== product.id)
      const next = pruneTombstones([product, ...full])
      const live = next.filter((p) => !p._tombstone).slice(0, MAX_GENERATED)
      // Garde les tombstones + les live cappés
      const stored = [...next.filter((p) => p._tombstone), ...live]
      localStorage.setItem(storageKey, JSON.stringify(stored))
      cloudPut(CLOUD_KEY, stored)
      return live
    })
  }, [storageKey, loadFull])

  const remove = useCallback((id) => {
    setGenerated((prev) => {
      const tombstone = { id, _tombstone: true, deletedAt: Date.now() }
      const full = loadFull()
      const next = [...full.filter((p) => p.id !== id), tombstone]
      localStorage.setItem(storageKey, JSON.stringify(next))
      cloudPut(CLOUD_KEY, next)
      return prev.filter((p) => p.id !== id)
    })
  }, [storageKey, loadFull])

  return { generated, add, remove }
}
