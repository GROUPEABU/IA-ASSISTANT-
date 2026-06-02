import { useEffect, useRef, useState } from 'react'

/**
 * Indicateur de progression pour les tâches IA (non-streamées).
 *
 * On ne connaît pas la durée exacte d'une réponse IA. La barre avance donc de
 * façon régulière sur une durée ESTIMÉE qui s'AUTO-CALIBRE : à chaque exécution
 * on mesure le temps réel d'apparition du résultat et on le réutilise comme
 * estimation pour la fois suivante (via `persistKey`). La fin est ainsi de plus
 * en plus juste. Si la tâche dépasse l'estimation, la barre rampe lentement
 * jusqu'à 98 % au lieu de se figer.
 *
 * Couleurs ADAPTÉES AU THÈME (clair / sombre) pour rester parfaitement
 * lisibles et contrastées dans les deux cas.
 *
 * @param {object}   props
 * @param {boolean}  props.active        — true tant que la tâche IA tourne
 * @param {string[]} [props.stages]      — libellés d'étapes affichés à tour de rôle
 * @param {number}   [props.estimatedMs] — durée estimée par défaut (1re exécution)
 * @param {string}   [props.label]       — libellé fixe (sinon les stages tournent)
 * @param {boolean}  [props.compact]     — variante compacte (barre fine seule)
 * @param {string}   [props.persistKey]  — clé pour mémoriser/calibrer la durée réelle
 */

// Détecte le thème courant (classe `.light` sur <html>) et réagit aux changements.
function useIsLight() {
  const [isLight, setIsLight] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  )
  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsLight(root.classList.contains('light'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isLight
}

export default function AIProgress({ active, stages = [], estimatedMs = 18000, label, compact = false, persistKey }) {
  const [pct, setPct] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const estRef = useRef(estimatedMs)
  const isLight = useIsLight()

  const storeKey = persistKey ? `abu_aiprog_${persistKey}` : null

  useEffect(() => {
    if (!active) {
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

  // ── Palette par thème ───────────────────────────────────────────────
  // Sombre : piste slate claire, accent cyan vif.
  // Clair  : piste slate foncée subtile, accent teal foncé (plus lisible sur blanc).
  const C = isLight
    ? {
        track:    'rgba(15,23,42,0.12)',
        accent:   '#0e7490',              // teal-700 — net sur fond blanc
        gradient: 'linear-gradient(90deg, #0e7490, #0891b2)',
        glow:     '0 0 8px rgba(8,145,178,0.45)',
        labelCls: 'text-slate-500',
      }
    : {
        track:    'rgba(148,163,184,0.28)',
        accent:   '#22d3ee',              // cyan-400 — éclatant sur fond navy
        gradient: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
        glow:     '0 0 10px rgba(34,211,238,0.7)',
        labelCls: 'text-slate-400',
      }

  const barFill = (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: C.track }}>
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-out"
        style={{
          width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
          background: C.gradient,
          boxShadow: C.glow,
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
          <circle cx="32" cy="32" r="28" fill="none" stroke={C.track} strokeWidth="6" />
          <circle
            cx="32" cy="32" r="28" fill="none" stroke={C.accent} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 28}
            strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 200ms ease-out', filter: `drop-shadow(${C.glow})` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums" style={{ color: C.accent }}>
          {rounded}%
        </span>
      </div>

      {/* Libellé d'étape */}
      {text && (
        <p className={`text-sm ${C.labelCls} text-center leading-snug min-h-[1.25rem]`}>{text}</p>
      )}

      {/* Barre linéaire */}
      {barFill}
    </div>
  )
}
