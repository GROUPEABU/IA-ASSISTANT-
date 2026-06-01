import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Piège le focus clavier à l'intérieur d'un conteneur (modale / dialog) :
 *  - place le focus dans la modale à l'ouverture (sauf si un élément y est déjà
 *    focalisé, ex. autoFocus),
 *  - boucle Tab / Shift+Tab sur les éléments focusables,
 *  - restaure le focus sur l'élément précédent à la fermeture.
 *
 * Retourne une ref à poser sur le conteneur de la modale.
 */
export default function useFocusTrap(active = true) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previous = document.activeElement
    const focusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null)

    // Place le focus dans la modale (champ de saisie en priorité), sauf si un
    // élément interne est déjà ciblé. `previous` reste ainsi le déclencheur.
    if (!node.contains(document.activeElement)) {
      const f = focusables()
      const preferred = f.find((el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) || f[0]
      ;(preferred || node).focus?.()
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [active])

  return ref
}
