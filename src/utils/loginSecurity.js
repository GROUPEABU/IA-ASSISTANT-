/**
 * Throttle UX du login côté client (en plus du rate limit serveur) — logique
 * PURE et testable, sans accès localStorage. AuthContext lit/écrit l'objet
 * `security` ({ attempts: number[], blocked_until: number }) et délègue ici.
 */

export const MAX_ATTEMPTS  = 5
export const WINDOW_MS      = 15 * 60 * 1000   // fenêtre glissante de comptage
export const LOCKOUT_SHORT  = 15 * 60 * 1000   // ≥ 5 échecs  → 15 min
export const LOCKOUT_LONG   = 60 * 60 * 1000   // ≥ 10 échecs → 1 h

/**
 * Calcule l'état de sécurité à partir de l'objet stocké et de l'instant courant.
 * @param {{ attempts?: number[], blocked_until?: number }} security
 * @param {number} now
 * @returns {{ isBlocked: boolean, remainingMs: number, failCount: number, attemptsLeft: number }}
 */
export function computeSecurityStatus(security, now = Date.now()) {
  const { attempts = [], blocked_until = 0 } = security || {}
  const recent = attempts.filter((t) => now - t < WINDOW_MS)
  const isBlocked = now < blocked_until
  return {
    isBlocked,
    remainingMs: isBlocked ? blocked_until - now : 0,
    failCount: recent.length,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - recent.length),
  }
}

/**
 * Enregistre un échec : renvoie le NOUVEL objet security à persister.
 * @param {{ attempts?: number[] }} security
 * @param {number} now
 * @returns {{ attempts: number[], blocked_until: number }}
 */
export function recordFailureState(security, now = Date.now()) {
  const { attempts = [] } = security || {}
  const recent = [...attempts.filter((t) => now - t < WINDOW_MS), now]
  const blocked_until =
    recent.length >= 10           ? now + LOCKOUT_LONG  :
    recent.length >= MAX_ATTEMPTS ? now + LOCKOUT_SHORT : 0
  return { attempts: recent, blocked_until }
}
