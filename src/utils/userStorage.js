/**
 * User-scoped localStorage helpers.
 * Keys are prefixed `abu_u{userId}_` when a userId is known,
 * falling back to the bare key for unauthenticated access.
 */

export const ukey = (userId, key) =>
  userId != null ? `abu_u${userId}_${key}` : key

export function getItem(userId, key, fallback = null) {
  try {
    const val = localStorage.getItem(ukey(userId, key))
    return val !== null ? val : fallback
  } catch { return fallback }
}

export function setItem(userId, key, value) {
  try { localStorage.setItem(ukey(userId, key), value) } catch {}
}

export function removeItem(userId, key) {
  try { localStorage.removeItem(ukey(userId, key)) } catch {}
}

/** Read the current session userId without needing React context. */
export function getSessionUserId() {
  try {
    const s = JSON.parse(localStorage.getItem('abu_session') || 'null')
    return s?.id ?? null
  } catch { return null }
}
