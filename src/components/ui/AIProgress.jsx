import { useEffect, useRef, useState } from 'react'

/**
 * Indicateur de progression pour les tâches IA (non-streamées).
 *
 * On ne connaît pas la durée exacte d'une réponse IA. La barre avance donc de
 * façon régulière sur une durée ESTIMÉE qui s'AUTO-CALIBRE : à chaque exécution
 * on mesure le temps réel d'apparition du résultat et on le réutilise comme
 * estimation pour la fois suivante (via `persistKey`). La fin est ainsi de plus
 * en plus juste (ni trop rapide, ni interminable). Si la tâche dépasse encore
 * l'estimation, la barre rampe lentement jusqu'à 98 % au lieu de se figer.
 *
 * @param {object}   props
 * @param {boolean}  props.active        — true tant que la tâche IA tourne
 * @param {string[]} [props.stages]      — libellés d'étapes affichés à tour de rôle
 * @param {number}   [props.estimatedMs] — durée estimée par défaut (1re exécution)
 * @param {string}   [props.label]       — libellé fixe (sinon les stages tournent)
 * @param {boolean}  [props.compact]     — variante compacte (barre fine seule)
 * @param {string}   [props.persistKey]  — clé pour mémoriser/calibrer la durée réelle
 */
export default function AIProgress({ active, stages = [], estimatedMs = 18000, label, compact = false, persistKey }) {
  const [pct, setPct] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const estRef = useRef(estimatedMs)

  // Durée estimée auto-calibrée : on récupère le dernier temps réel mesuré.
  const storeKey = persistKey ? `abu_aiprog_${persistKey}` : null

  useEffect(() => {
    if (!active) {
      // Tâche finie : on mesure le temps réel d'apparition du résultat pour
      // calibrer la prochaine exécution, puis on complète à 100 %.
      if (storeKey && startRef.current) {
        const dur = performance.now() - startRef.current
        if (dur > 1500) {
          estRef.current = Math.round(dur)
          try { localStorage.setItem(storeKey, String(Math.round(dur))) } catch {}
        }
      }
      startRef.current = 0
      setPct(p => (p > 0 ? 100 : 0))
      const tt = setTimeout(() => { setPct(0); setStageIdx(0) }, 450)
      return () => clearTimeout(tt)
    }

    // Au démarrage : on charge la dernière durée réelle connue comme estimation.
    if (storeKey) {
      try {
        const saved = Number(localStorage.getItem(storeKey))
        if (saved > 1500) estRef.current = saved
      } catch {}
    }
    const est = estRef.current

    setPct(0)
    setStageIdx(0)
    startRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      // Phase 1 : progression régulière jusqu'à 92 % sur la durée estimée.
      // Phase 2 : si on dépasse l'estimation, on rampe lentement (~0,4 %/s)
      // jusqu'à 98 % pour ne jamais figer la barre.
      let pctVal
      if (elapsed <= est) {
        pctVal = (elapsed / est) * 92
      } else {
        pctVal = Math.min(98, 92 + (elapsed - est) / 2500)
      }
      setPct(pctVal)
      if (stages.length > 1) {
        const ratio = Math.min(1, elapsed / est)
        const idx = Math.min(stages.length - 1, Math.floor(ratio * stages.length))
        setStageIdx(idx)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, storeKey, stages.length])

  const text = label || stages[stageIdx] || ''
  const rounded = Math.round(pct)

  // Barre pleine : couleur saturée + halo, bien visible sur fond clair ET sombre.
  const barFill = (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(100,116,139,0.28)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-out"
        style={{
          width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
          background: 'linear-gradient(90deg, #0284c7, #06b6d4)',
          boxShadow: '0 0 10px rgba(6,182,212,0.7)',
        }}
      />
    </div>
  )

  if (compact) {
    return <div className="w-full">{barFill}</div>
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3">
      {/* Anneau de progression */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(100,116,139,0.30)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r="28" fill="none" stroke="#06b6d4" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 28}
            strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 200ms ease-out', filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums" style={{ color: '#06b6d4' }}>
          {rounded}%
        </span>
      </div>

      {/* Libellé d'étape */}
      {text && (
        <p className="text-sm text-slate-400 text-center leading-snug min-h-[1.25rem]">{text}</p>
      )}

      {/* Barre linéaire */}
      {barFill}
    </div>
  )
}
