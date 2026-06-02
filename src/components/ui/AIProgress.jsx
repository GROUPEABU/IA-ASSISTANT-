import { useEffect, useRef, useState } from 'react'

/**
 * Indicateur de progression pour les tâches IA (non-streamées).
 *
 * On ne connaît pas la durée exacte d'une réponse IA, donc la barre avance de
 * façon asymptotique vers ~95 % sur la durée estimée (rapide au début, ralentit
 * près de la fin), puis saute à 100 % dès que la tâche se termine. Cela donne un
 * retour visuel honnête : « ça avance » sans jamais prétendre être fini avant.
 *
 * @param {object}   props
 * @param {boolean}  props.active        — true tant que la tâche IA tourne
 * @param {string[]} [props.stages]      — libellés d'étapes affichés à tour de rôle
 * @param {number}   [props.estimatedMs] — durée estimée de la tâche (défaut 18 s)
 * @param {string}   [props.label]       — libellé fixe (sinon les stages tournent)
 * @param {boolean}  [props.compact]     — variante compacte (barre fine seule)
 */
export default function AIProgress({ active, stages = [], estimatedMs = 18000, label, compact = false }) {
  const [pct, setPct] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) {
      // Tâche finie : on complète brièvement à 100 % avant de masquer.
      setPct(p => (p > 0 ? 100 : 0))
      const t = setTimeout(() => { setPct(0); setStageIdx(0) }, 450)
      return () => clearTimeout(t)
    }

    setPct(0)
    setStageIdx(0)
    startRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      // Progression RÉGULIÈRE (quasi linéaire) jusqu'à 95 % : ni démarrage trop
      // rapide, ni longue traîne en fin. Une fois 95 % atteint, on patiente là
      // jusqu'à la fin réelle de la tâche (qui fait sauter à 100 %).
      const ratio = Math.min(1, elapsed / estimatedMs)
      setPct(ratio * 95)
      // Étape courante proportionnelle au temps écoulé (capée à la dernière).
      if (stages.length > 1) {
        const idx = Math.min(stages.length - 1, Math.floor((elapsed / estimatedMs) * stages.length))
        setStageIdx(idx)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, estimatedMs, stages.length])

  const text = label || stages[stageIdx] || ''
  const rounded = Math.round(pct)

  if (compact) {
    return (
      <div className="w-full">
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.25)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #50E5E5)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3">
      {/* Anneau de progression */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          {/* Piste : gris slate visible sur fond clair ET sombre */}
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(148,163,184,0.30)" strokeWidth="6" />
          {/* Arc : bleu sky, contrasté sur les deux thèmes */}
          <circle
            cx="32" cy="32" r="28" fill="none" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 28}
            strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 200ms ease-out', filter: 'drop-shadow(0 0 3px rgba(14,165,233,0.45))' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums" style={{ color: '#0ea5e9' }}>
          {rounded}%
        </span>
      </div>

      {/* Libellé d'étape */}
      {text && (
        <p className="text-sm text-slate-400 text-center leading-snug min-h-[1.25rem]">{text}</p>
      )}

      {/* Barre linéaire */}
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.25)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #50E5E5)' }}
        />
      </div>
    </div>
  )
}
