/**
 * Password-reset helpers — shared between ForgotPassword and ResetPassword pages.
 *
 * Tokens are stored in localStorage under a per-user key.
 * No server involvement: this is intentional for this client-side deployment.
 */

const RESET_KEY_PREFIX  = 'abu_reset_'
const RESET_TRIES_PREFIX = 'abu_reset_tries_'
export const RESET_TTL_MS   = 15 * 60 * 1000 // 15 minutes
export const MAX_OTP_TRIES  = 5

export function generateOTP() {
  // crypto.getRandomValues provides a CSPRNG unlike Math.random()
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(100000 + (arr[0] % 900000))
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
  const key = username.toLowerCase()
  localStorage.removeItem(RESET_KEY_PREFIX + key)
  localStorage.removeItem(RESET_TRIES_PREFIX + key)
}

/** Increment attempt counter. Returns remaining tries (0 = locked). */
export function recordOtpAttempt(username) {
  const key  = RESET_TRIES_PREFIX + username.toLowerCase()
  const tries = (parseInt(localStorage.getItem(key) || '0', 10)) + 1
  localStorage.setItem(key, String(tries))
  return Math.max(0, MAX_OTP_TRIES - tries)
}

/** True if the user has exhausted OTP attempts. */
export function isOtpLocked(username) {
  const tries = parseInt(localStorage.getItem(RESET_TRIES_PREFIX + username.toLowerCase()) || '0', 10)
  return tries >= MAX_OTP_TRIES
}
