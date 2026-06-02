/**
 * Point d'entrée unique de remontée d'erreurs.
 *
 * Aujourd'hui : trace console + tampon circulaire des 10 dernières erreurs dans
 * localStorage (`abu_errors`), consultable par un administrateur pour
 * diagnostiquer un incident signalé. C'est aussi l'unique endroit à brancher le
 * jour où une stack d'observabilité (Sentry, endpoint API…) est provisionnée.
 */
const STORE_KEY = 'abu_errors'
const MAX = 10

export function reportError(error, context = {}) {
  // Toujours visible en console (dev comme prod).
  // eslint-disable-next-line no-console
  console.error('[reportError]', context?.where || '', error)

  try {
    const entry = {
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      where: context?.where ?? null,
      at: new Date().toISOString(),
      url: typeof location !== 'undefined' ? location.pathname : null,
    }
    const prev = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX)
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch { /* stockage indisponible : on ne bloque jamais */ }
}

/** Branche les gestionnaires globaux (erreurs non capturées + promesses rejetées). */
export function installGlobalErrorReporting() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => reportError(e.error || e.message, { where: 'window.onerror' }))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { where: 'unhandledrejection' }))
}
