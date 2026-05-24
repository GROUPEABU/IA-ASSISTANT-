/**
 * Password-reset helpers — shared between ForgotPassword and ResetPassword pages.
 *
 * Tokens are stored in localStorage under a per-user key.
 * No server involvement: this is intentional for this client-side deployment.
 */

const RESET_KEY_PREFIX = 'abu_reset_'
export const RESET_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function storeResetToken(username, code) {
  const payload = { code, exp: Date.now() + RESET_TTL_MS }
  localStorage.setItem(RESET_KEY_PREFIX + username.toLowerCase(), JSON.stringify(payload))
}

/** Returns the stored token payload, or null if absent or unparseable. */
export function readResetToken(username) {
  try {
    const raw = localStorage.getItem(RESET_KEY_PREFIX + username.toLowerCase())
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function consumeResetToken(username) {
  localStorage.removeItem(RESET_KEY_PREFIX + username.toLowerCase())
}
