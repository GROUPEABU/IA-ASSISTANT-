import { ukey } from './userStorage'

/** Profil éditable d'un compte (prénom, nom, téléphone), stocké par utilisateur. */
export function getProfile(uid) {
  if (uid == null) return {}
  try { return JSON.parse(localStorage.getItem(ukey(uid, 'profile')) || '{}') || {} }
  catch { return {} }
}

/**
 * Nom d'affichage : « prénom nom » du profil si renseigné, sinon le nom du
 * compte de session. Utilisé partout où l'utilisateur est affiché (sidebar…).
 */
export function displayName(user) {
  const p = getProfile(user?.id ?? null)
  const full = [p.firstname, p.lastname].filter(Boolean).join(' ').trim()
  return full || user?.name || ''
}

/** Initiales dérivées du profil si renseigné, sinon celles du compte. */
export function displayInitials(user) {
  const p = getProfile(user?.id ?? null)
  const f = (p.firstname || '').trim()
  const l = (p.lastname || '').trim()
  if (f || l) return (((f[0] || '') + (l[0] || '')).toUpperCase()) || (user?.initials || '?')
  return user?.initials || '?'
}
