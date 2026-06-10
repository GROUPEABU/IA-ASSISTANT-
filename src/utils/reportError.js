/**
 * Point d'entrée unique de remontée d'erreurs.
 *
 * Trois canaux : trace console, tampon circulaire localStorage (`abu_errors`,
 * 10 dernières — diagnostic local), et remontée serveur vers `/api/log-error`
 * (visible dans les logs Vercel). La remontée serveur est fire-and-forget,
 * dédupliquée par message et plafonnée par session pour ne jamais spammer.
 */
const STORE_KEY = 'abu_errors'
const MAX = 10
const MAX_REMOTE_PER_SESSION = 5

const sentMessages = new Set()

function postToServer(entry) {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (sentMessages.size >= MAX_REMOTE_PER_SESSION || sentMessages.has(entry.message)) return
    sentMessages.add(entry.message)
    const payload = JSON.stringify({ ...entry, ua: typeof navigator !== 'undefined' ? navigator.userAgent : null })
    // sendBeacon survit aux fermetures de page ; fetch keepalive en repli.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/log-error', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/log-error', { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
    }
  } catch { /* la remontée ne doit jamais casser l'app */ }
}

export function reportError(error, context = {}) {
  // Toujours visible en console (dev comme prod).
  // eslint-disable-next-line no-console
  console.error('[reportError]', context?.where || '', error)

  const entry = {
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    where: context?.where ?? null,
    at: new Date().toISOString(),
    url: typeof location !== 'undefined' ? location.pathname : null,
  }

  try {
    const prev = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX)
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch { /* stockage indisponible : on ne bloque jamais */ }

  postToServer(entry)
}

/** Branche les gestionnaires globaux (erreurs non capturées + promesses rejetées). */
export function installGlobalErrorReporting() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => reportError(e.error || e.message, { where: 'window.onerror' }))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { where: 'unhandledrejection' }))
}
