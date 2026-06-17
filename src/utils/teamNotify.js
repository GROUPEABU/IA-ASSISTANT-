/**
 * Suivi des veilles d'équipe « non vues » pour le badge de notification (cloche
 * de la sidebar). Le statut « vu » est propre à chaque utilisateur (clé
 * per-user), alors que le flux des veilles est partagé par toute l'équipe.
 *
 * - getTeamSeenAt()         : horodatage de la dernière visite du flux. Initialisé
 *   à « maintenant » au premier appel (on ne notifie pas pour l'historique existant).
 * - markTeamSeen(ts)        : marque le flux comme vu jusqu'à `ts`, émet `abu:team-seen`.
 * - countUnseenTeamVeilles(): nombre de veilles partagées par d'AUTRES membres,
 *   postérieures à la dernière visite.
 */
import { ukey, getSessionUserId } from './userStorage'
import { listSharedVeilles } from './cloudStore'

const SEEN_KEY = 'team_seen_at'

export function getTeamSeenAt() {
  try {
    const uid = getSessionUserId()
    const raw = localStorage.getItem(ukey(uid, SEEN_KEY))
    if (raw == null) {
      const now = Date.now()
      localStorage.setItem(ukey(uid, SEEN_KEY), String(now))
      return now
    }
    return Number(raw) || 0
  } catch { return 0 }
}

export function markTeamSeen(ts) {
  try {
    const uid = getSessionUserId()
    const cur = Number(localStorage.getItem(ukey(uid, SEEN_KEY))) || 0
    const next = Math.max(cur, ts || Date.now())
    localStorage.setItem(ukey(uid, SEEN_KEY), String(next))
    window.dispatchEvent(new CustomEvent('abu:team-seen'))
  } catch {}
}

/** @returns {Promise<number>} veilles d'autres membres non encore vues. */
export async function countUnseenTeamVeilles() {
  const uid = getSessionUserId()
  const seen = getTeamSeenAt()
  const items = await listSharedVeilles()
  return items.filter((it) => {
    const ts = Number(it.sharedAt) || 0
    return ts > seen && String(it.authorId) !== String(uid)
  }).length
}
