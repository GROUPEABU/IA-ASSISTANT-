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
]

/** Case-insensitive lookup by username only. */
export function findUserByUsername(username) {
  return USERS.find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null
}

/** Case-insensitive credential check. Returns the user object (without password) or null. */
export function validateCredentials(username, password) {
  const user = findUserByUsername(username)
  if (!user || user.password !== password) return null
  const { password: _, ...safe } = user
  return safe
}
