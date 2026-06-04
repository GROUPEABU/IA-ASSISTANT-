/**
 * Single source of truth for the application's user registry.
 *
 * This data is intentionally client-side in this deployment (no backend).
 * Passwords are NOT stored in clear text: only their SHA-256 hash (salted)
 * is kept here, so the shipped bundle never reveals a usable password.
 * Password overrides from the reset-password flow are stored (hashed too)
 * in localStorage under 'abu_pw_overrides' — see src/utils/passwordReset.js.
 *
 * Note: client-side hashing raises the bar (no plaintext in source/bundle)
 * but is not a substitute for a real backend with per-user salts + bcrypt.
 */
export const USERS = [
  { id: 1, username: 'hubert.saget@aafgroup.eu', passwordHash: 'ed74e595563f0f76da37eebc8eeb20afb8fac7ee82d8e550104392fe975d4dcb', name: 'HUBERT SAGET', role: 'admin',  initials: 'HS' },
  { id: 3, username: 'demo@autobuyunion.eu', passwordHash: '092c365fd32a2be2ef2631fafc3a8df0e75aaafbc1b87f69480abc170f8816e8', name: 'Compte Démo',    role: 'membre', initials: 'DM' },
]

// Salt prefix applied before hashing. Versioned so it can be rotated later.
const PW_SALT = 'abu_v1'

/** SHA-256 (hex) of an arbitrary string, via the Web Crypto API. */
async function sha256Hex(str) {
  const data = new TextEncoder().encode(str)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Salted hash of a clear-text password — used both to verify and to store resets. */
export function hashPassword(password) {
  return sha256Hex(`${PW_SALT}:${password}`)
}

/** Case-insensitive lookup by username only. */
export function findUserByUsername(username) {
  return USERS.find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null
}

/** Returns true if the account has an expiry date that has passed. */
export function isExpired(user) {
  if (!user?.expiresAt) return false
  return Date.now() > new Date(user.expiresAt).getTime()
}

/**
 * Case-insensitive credential check. Resolves to the user object (without the
 * hash) or null. Async because hashing uses the Web Crypto API.
 */
export async function validateCredentials(username, password) {
  const user = findUserByUsername(username)
  if (!user) return null
  const hash = await hashPassword(password)
  if (hash !== user.passwordHash) return null
  if (isExpired(user)) return null
  const { passwordHash: _, expiresAt: __, ...safe } = user
  return safe
}
