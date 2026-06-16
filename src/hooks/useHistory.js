import { useState, useCallback, useMemo, useEffect } from 'react'
import { ukey, getSessionUserId } from '@/utils/userStorage'
import { cloudGet, cloudPut } from '@/utils/cloudStore'

const MAX_UNPINNED = 30
const MAX_PINNED = 20

// Épinglés d'abord, puis du plus récent au plus ancien — l'ordre de stockage
// EST l'ordre d'affichage (les callbacks par index restent donc valides).
const sortItems = (arr) =>
  [...arr].sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.savedAt || 0) - (a.savedAt || 0))

const capItems = (arr) => {
  const pinned = arr.filter((i) => i.pinned).slice(0, MAX_PINNED)
  const rest = arr.filter((i) => !i.pinned).slice(0, MAX_UNPINNED)
  return sortItems([...pinned, ...rest])
}

// Fusion entre appareils : union par id ; un élément épinglé sur n'importe quel
// appareil le reste ; les champs locaux priment en cas de conflit.
const mergeById = (local, remote) => {
  const map = new Map()
  for (const it of [...remote, ...local]) {
    if (!it || it.id == null) continue
    const ex = map.get(it.id)
    map.set(it.id, ex ? { ...ex, ...it, pinned: ex.pinned || it.pinned } : it)
  }
  return [...map.values()]
}

export function useHistory(namespace) {
  const storageKey = useMemo(() => ukey(getSessionUserId(), `history_${namespace}`), [namespace])
  const cloudKey = `history_${namespace}`

  const [history, setHistory] = useState(() => {
    try { return sortItems(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch { return [] }
  })

  const persist = (next) => {
    try {
      if (next.length === 0) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {}
    cloudPut(cloudKey, next) // miroir serveur (no-op si synchro inactive)
  }

  // Au montage : récupère la copie du compte et fusionne avec le local.
  useEffect(() => {
    let alive = true
    cloudGet(cloudKey).then((remote) => {
      if (!alive || remote === undefined) return // synchro indisponible
      setHistory((local) => {
        const merged = capItems(mergeById(local, Array.isArray(remote) ? remote : []))
        persist(merged)
        return merged
      })
    })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace])

  const add = useCallback((item) => {
    setHistory(prev => {
      const entry = { ...item, id: Date.now() + Math.random(), savedAt: Date.now() }
      const next = capItems([entry, ...prev])
      persist(next)
      return next
    })
  }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback((index) => {
    setHistory(prev => {
      const next = prev.filter((_, i) => i !== index)
      persist(next)
      return next
    })
  }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePin = useCallback((index) => {
    setHistory(prev => {
      const next = capItems(prev.map((it, i) => (i === index ? { ...it, pinned: !it.pinned } : it)))
      persist(next)
      return next
    })
  }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // « Tout effacer » préserve les éléments épinglés (c'est leur raison d'être).
  const clear = useCallback(() => {
    setHistory(prev => {
      const next = prev.filter((i) => i.pinned)
      persist(next)
      return next
    })
  }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { history, add, remove, clear, togglePin }
}
