import { lazy } from 'react'

/**
 * Lazy import résilient aux déploiements.
 *
 * Après un déploiement Vercel, l'index.html mis en cache par le navigateur
 * référence d'anciens chunks hashés (ex. `Hub-DwUdpspx.js`) qui n'existent
 * plus sur le serveur. Le `import()` dynamique échoue alors avec
 * « Failed to fetch dynamically imported module ».
 *
 * Ici, on recharge automatiquement la page UNE SEULE FOIS pour récupérer
 * l'index.html frais (et donc les bons noms de chunks). Un drapeau en
 * sessionStorage empêche toute boucle de rechargement : si l'erreur persiste
 * après un reload, on relaie l'erreur à l'ErrorBoundary.
 */
const RELOAD_KEY = 'abu_chunk_reload'

export function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      const mod = await factory()
      // Chargement réussi → on réarme le mécanisme pour le prochain déploiement.
      try { sessionStorage.removeItem(RELOAD_KEY) } catch {}
      return mod
    } catch (err) {
      // Couvre toutes les formulations selon le navigateur quand un chunk hashé
      // a disparu après déploiement (le serveur renvoie alors l'index.html) :
      //  - Chrome/Edge : « Failed to fetch dynamically imported module »
      //  - Firefox     : « error loading dynamically imported module »
      //  - Safari/iOS  : « 'text/html' is not a valid JavaScript MIME type »
      //                  / « Importing a module script failed » / « Load failed »
      //  - HTML parsé comme JS : « Unexpected token '<' »
      const stale = /dynamically imported module|module script|Failed to fetch|load failed|MIME type|Unexpected token/i
        .test(err?.message || '')
      let alreadyReloaded = false
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1' } catch {}

      if (stale && !alreadyReloaded) {
        try { sessionStorage.setItem(RELOAD_KEY, '1') } catch {}
        window.location.reload()
        // Maintient Suspense en fallback pendant que la page se recharge.
        return new Promise(() => {})
      }
      throw err
    }
  })
}

/**
 * Filet de sécurité : Vite émet `vite:preloadError` quand un module préchargé
 * (modulepreload) échoue. On recharge une fois, même garde anti-boucle.
 * À appeler une fois au démarrage de l'app.
 */
export function installPreloadErrorReload() {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', () => {
    let alreadyReloaded = false
    try { alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1' } catch {}
    if (!alreadyReloaded) {
      try { sessionStorage.setItem(RELOAD_KEY, '1') } catch {}
      window.location.reload()
    }
  })
}
