import { useEffect, useRef, useState } from 'react'

/**
 * « Tirer pour rafraîchir » (mobile). Écoute les gestes tactiles sur le conteneur
 * scrollable indiqué : quand on est tout en haut et qu'on tire vers le bas
 * au-delà du seuil, `onRefresh` est appelé.
 *
 * Tactile uniquement (no-op sur souris/desktop). Renvoie `{ distance, refreshing }`
 * pour piloter un indicateur visuel.
 */
export function usePullToRefresh(onRefresh, {
  scrollSelector = '.layout-scroll-main',
  enabled = true,
  threshold = 70,    // px de tirage pour déclencher
  maxPull = 110,     // tirage visuel maximal
  resistance = 0.5,  // 0→1 : part du déplacement du doigt suivie par le contenu
} = {}) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const cb = useRef(onRefresh); cb.current = onRefresh
  const distRef = useRef(0)
  const pulling = useRef(false)
  const startY = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('ontouchstart' in window)) return
    const el = document.querySelector(scrollSelector)
    if (!el) return
    const set = (v) => { distRef.current = v; setDistance(v) }

    const onStart = (e) => {
      if (busy.current || el.scrollTop > 0) { pulling.current = false; return }
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
    const onMove = (e) => {
      if (!pulling.current) return
      if (el.scrollTop > 0) { pulling.current = false; set(0); return }
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { set(0); return }
      e.preventDefault() // supprime le rebond natif pendant le tirage
      set(Math.min(delta * resistance, maxPull))
    }
    const onEnd = () => {
      if (!pulling.current) return
      pulling.current = false
      if (distRef.current >= threshold) {
        busy.current = true
        setRefreshing(true)
        set(threshold) // garde l'indicateur visible le temps du rafraîchissement
        Promise.resolve().then(() => cb.current?.()).catch(() => {})
      } else {
        set(0)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, scrollSelector, threshold, maxPull, resistance])

  return { distance, refreshing, threshold }
}
