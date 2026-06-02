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

// Mémoire de continuité (hors React, survit au démontage du composant) :
// retient le dernier % atteint par clé, pour reprendre une progression
// interrompue (ex. PriceWatch phase 1 → phase 2) au lieu de repartir de 0.
const resumeMem = new Map() // storeKey -> { pct, at }

export default function AIProgress({ active, stages = [], estimatedMs = 18000, label, compact = false, persistKey, resume = false }) {
  const [pct, setPct] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const estRef = useRef(estimatedMs)
  const pctRef = useRef(0)
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
        // +12 % de marge sur la durée réelle observée : la barre vise un peu au-delà
        // du temps habituel → elle finit le plus souvent AVANT la fin réelle (saut
        // à 100 %) plutôt que de stagner. « Fin plus rapide », jamais figée.
        if (saved > 1500) estRef.current = Math.round(saved * 1.12)
      } catch {}
    }
    const est = estRef.current

    // Reprise de continuité : si une exécution liée vient de s'interrompre
    // (< 4 s) sans avoir terminé, on redémarre depuis ~la moitié du % acquis
    // (plafonné à 60 %) en décalant l'horloge, plutôt que de revenir à 0.
    let initialPct = 0
    if (resume && storeKey) {
      const mem = resumeMem.get(storeKey)
      if (mem && Date.now() - mem.at < 4000 && mem.pct > 0 && mem.pct < 95) {
        initialPct = Math.min(mem.pct * 0.5, 60)
      }
    }
    const initialElapsed = initialPct > 0 ? (initialPct / 90) * est : 0

    setPct(initialPct)
    pctRef.current = initialPct
    setStageIdx(0)
    startRef.current = performance.now() - initialElapsed

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      let pctVal
      if (elapsed <= est) {
        // Phase 1 : progression régulière 0 → 90 % sur la durée estimée.
        pctVal = (elapsed / est) * 90
      } else {
        // Phase 2 (dépassement) : sprint LINÉAIRE rapide 90→99 % en 3 s, puis
        // rampe très lente jusqu'à 99,5 %. Jamais figé visuellement.
        const over = elapsed - est
        if (over <= 3000) {
          pctVal = 90 + (over / 3000) * 9          // 90 → 99 % en 3 s
        } else {
          pctVal = 99 + Math.min(0.45, (over - 3000) / 30000 * 0.45)  // 99 → 99,45 % très lentement
        }
      }
      setPct(pctVal)
      pctRef.current = pctVal
      if (stages.length > 1) {
        const ratio = Math.min(1, elapsed / est)
        const idx = Math.min(stages.length - 1, Math.floor(ratio * stages.length))
        setStageIdx(idx)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      // Sauve la progression au démontage (ou désactivation) pour permettre
      // une reprise immédiate si la tâche enchaîne une seconde phase.
      if (resume && storeKey) resumeMem.set(storeKey, { pct: pctRef.current, at: Date.now() })
    }
  }, [active, storeKey, stages.length, resume])

  const text = label || stages[stageIdx] || ''
  const rounded = Math.round(pct)

  // ── Palette par thème ───────────────────────────────────────────────
  // Sombre : piste slate claire, accent cyan vif.
  // Clair  : piste slate foncée subtile, accent teal foncé (plus lisible sur blanc).
  // Piste volontairement DISCRÈTE + arc VIF : le contraste rend l'avancement
  // lisible même à faible %. Halo court (3-4 px) pour un arc net, pas flou.
  const C = isLight
    ? {
        track:    'rgba(15,23,42,0.10)',
        accent:   '#0e7490',              // teal-700 — net sur fond blanc
        gradient: 'linear-gradient(90deg, #0e7490, #0891b2)',
        glow:     '0 0 3px rgba(14,116,144,0.40)',
        labelCls: 'text-slate-500',
      }
    : {
        track:    'rgba(148,163,184,0.20)',
        accent:   '#22d3ee',              // cyan-400 — éclatant sur fond navy
        gradient: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
        glow:     '0 0 4px rgba(34,211,238,0.55)',
        labelCls: 'text-slate-400',
      }

  const waiting = pct >= 99

  const barFill = (
    // width:100% inline → la piste occupe toujours toute la largeur disponible,
    // même imbriquée sous un parent `items-center` (robuste Safari iOS).
    <div className="h-2 rounded-full overflow-hidden" style={{ background: C.track, width: '100%' }}>
      <div
        // Pas de transition CSS sur `width` : la boucle requestAnimationFrame
        // réécrit la largeur à chaque frame. Une transition de 200 ms redémarrerait
        // en continu et figerait la barre sur sa valeur initiale (bug observé).
        className={`h-full rounded-full${waiting ? ' animate-pulse' : ''}`}
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
    <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
      {/* Ring + label centrés indépendamment de la barre */}
      <div className="flex flex-col items-center gap-3">
        {/* Anneau de progression */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke={C.track} strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke={C.accent} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
              // Pas de transition CSS : la boucle requestAnimationFrame met l'arc
              // à jour à chaque frame. Une transition stroke-dashoffset
              // redémarrerait en continu et figerait l'arc (même cause que la barre).
              style={{ filter: `drop-shadow(${C.glow})` }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums${waiting ? ' animate-pulse' : ''}`} style={{ color: C.accent }}>
            {rounded}%
          </span>
        </div>

        {/* Libellé d'étape */}
        {text && (
          <p className={`text-sm ${C.labelCls} text-center leading-snug min-h-[1.25rem]`}>{text}</p>
        )}
      </div>

      {/* Barre linéaire — pleine largeur (hors items-center pour éviter le shrink) */}
      {barFill}
    </div>
  )
}
