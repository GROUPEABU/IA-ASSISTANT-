import { useState, useCallback, useMemo, useEffect } from 'react'
import { ukey, getSessionUserId } from '@/utils/userStorage'
import { cloudGet, cloudPut } from '@/utils/cloudStore'

const MAX_UNPINNED = 30
const MAX_PINNED = 20
const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000

const sortLive = (arr) =>
  [...arr].sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.savedAt || 0) - (a.savedAt || 0))

const capLive = (arr) => {
  const pinned = arr.filter((i) => i.pinned).slice(0, MAX_PINNED)
  const rest = arr.filter((i) => !i.pinned).slice(0, MAX_UNPINNED)
  return sortLive([...pinned, ...rest])
}

const pruneTombstones = (arr) => {
  const cutoff = Date.now() - TOMBSTONE_TTL
  return arr.filter((it) => !it._tombstone || it.deletedAt > cutoff)
}

// Fusion inter-appareils : tombstone > item vivant ; local prime en cas d'égalité.
const mergeById = (local, remote) => {
  const map = new Map()
  for (const it of [...remote, ...local]) {
    if (!it || it.id == null) continue
    const ex = map.get(it.id)
    if (!ex) { map.set(it.id, it); continue }
    if (it._tombstone && !ex._tombstone) { map.set(it.id, it); continue }
    if (!it._tombstone && ex._tombstone) continue
    if (it._tombstone) {
      if (it.deletedAt >= ex.deletedAt) map.set(it.id, it)
    } else {
      map.set(it.id, { ...ex, ...it, pinned: ex.pinned || it.pinned })
    }
  }
  return [...map.values()]
}

export function useHistory(namespace) {
  const storageKey = useMemo(() => ukey(getSessionUserId(), `history_${namespace}`), [namespace])
  const cloudKey = `history_${namespace}`

  const loadFull = useCallback(() => {
    try { return pruneTombstones(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { return [] }
  }, [storageKey])

  const [history, setHistory] = useState(() =>
    capLive(sortLive(loadFull().filter((it) => !it._tombstone)))
  )

  const persist = useCallback((full) => {
    const pruned = pruneTombstones(full)
    try {
      if (pruned.length === 0) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(pruned))
    } catch {}
    cloudPut(cloudKey, pruned)
  }, [storageKey, cloudKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Au montage : fusionne avec le serveur, tombstones inclus.
  useEffect(() => {
    let alive = true
    cloudGet(cloudKey).then((remote) => {
      if (!alive || remote === undefined) return
      const merged = pruneTombstones(mergeById(loadFull(), Array.isArray(remote) ? remote : []))
      persist(merged)
      if (alive) setHistory(capLive(sortLive(merged.filter((it) => !it._tombstone))))
    })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace])

  const add = useCallback((item) => {
    setHistory(() => {
      const entry = { ...item, id: Date.now() + Math.random(), savedAt: Date.now() }
      const full = loadFull().filter((it) => it.id !== entry.id) // retire tombstone éventuel
      const next = pruneTombstones([entry, ...full])
      persist(next)
      return capLive(sortLive(next.filter((it) => !it._tombstone)))
    })
  }, [loadFull, persist]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback((index) => {
    setHistory((prev) => {
      const item = prev[index]
      if (!item) return prev
      const tombstone = { id: item.id, _tombstone: true, deletedAt: Date.now() }
      const next = [...loadFull().filter((it) => it.id !== item.id), tombstone]
      persist(next)
      return prev.filter((_, i) => i !== index)
    })
  }, [loadFull, persist]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePin = useCallback((index) => {
    setHistory((prev) => {
      const item = prev[index]
      if (!item) return prev
      const next = loadFull().map((it) =>
        it.id === item.id && !it._tombstone ? { ...it, pinned: !it.pinned } : it
      )
      persist(next)
      return capLive(sortLive(next.filter((it) => !it._tombstone)))
    })
  }, [loadFull, persist]) // eslint-disable-line react-hooks/exhaustive-deps

  // « Tout effacer » préserve les épinglés ; marque les autres comme supprimés.
  const clear = useCallback(() => {
    setHistory((prev) => {
      const now = Date.now()
      const next = loadFull().map((it) =>
        it._tombstone || it.pinned ? it : { id: it.id, _tombstone: true, deletedAt: now }
      )
      persist(next)
      return prev.filter((it) => it.pinned)
    })
  }, [loadFull, persist]) // eslint-disable-line react-hooks/exhaustive-deps

  return { history, add, remove, clear, togglePin }
}
