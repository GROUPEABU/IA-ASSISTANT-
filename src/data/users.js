/**
 * Single source of truth for the application's user registry.
 *
 * This data is intentionally client-side in this deployment (no backend).
 * Password overrides from the reset-password flow are stored separately
 * in localStorage under 'abu_pw_overrides' — see src/utils/passwordReset.js.
 */
export const USERS = [
  { id: 1, username: 'admin',               password: 'autobuyunion2025', name: 'Administrateur', role: 'admin',  initials: 'AD' },
  { id: 2, username: 'membre',              password: 'membre123',         name: 'Membre',         role: 'membre', initials: 'MB' },
  { id: 3, username: 'demo@autobuyunion.eu', password: 'Demo2025!',        name: 'Compte Démo',    role: 'membre', initials: 'DM' },
  { id: 4, username: 'demo1',               password: 'Demo1-24h!',        name: 'Démo 24h',       role: 'membre', initials: 'D1', expiresAt: '2026-05-29T23:59:59Z' },
  { id: 5, username: 'demo2',               password: 'Demo2-48h!',        name: 'Démo 48h',       role: 'membre', initials: 'D2', expiresAt: '2026-05-30T23:59:59Z' },
]

/** Case-insensitive lookup by username only. */
export function findUserByUsername(username) {
  return USERS.find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null
}

/** Returns true if the account has an expiry date that has passed. */
export function isExpired(user) {
  if (!user?.expiresAt) return false
  return Date.now() > new Date(user.expiresAt).getTime()
}

/** Case-insensitive credential check. Returns the user object (without password) or null. */
export function validateCredentials(username, password) {
  const user = findUserByUsername(username)
  if (!user || user.password !== password) return null
  if (isExpired(user)) return null
  const { password: _, expiresAt: __, ...safe } = user
  return safe
}
