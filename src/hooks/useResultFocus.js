import { useEffect, useRef } from 'react'

/**
 * Déplace le focus sur l'élément de résultat dès qu'il apparaît.
 *
 * Améliore la navigation clavier et l'expérience lecteur d'écran : après un
 * calcul/analyse, le focus n'est plus bloqué sur le bouton déclencheur mais
 * porté sur le titre du résultat (à associer à `tabIndex={-1}`). On évite le
 * saut de défilement (`preventScroll`) car le scroll est géré ailleurs.
 *
 * @param {boolean} active — true quand le résultat vient de s'afficher
 * @returns {object} ref à poser sur l'élément à focaliser
 */
export function useResultFocus(active) {
  const ref = useRef(null)
  useEffect(() => {
    if (active && ref.current) {
      try { ref.current.focus({ preventScroll: true }) } catch {}
    }
  }, [active])
  return ref
}
