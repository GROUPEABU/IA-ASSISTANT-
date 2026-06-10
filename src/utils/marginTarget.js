/**
 * Marge partenaire cible (€ HT) — réglage par utilisateur (Paramètres).
 * Affichée dans les rapports de veille ; n'altère PAS le prompt Veille Prix
 * (verrouillé) — usage informatif/affichage uniquement.
 */
import { getSessionUserId, ukey } from './userStorage'

export const MARGIN_DEFAULT = 3500
export const MARGIN_MIN = 500
export const MARGIN_MAX = 20000

export function getMarginTarget() {
  try {
    const v = Number(localStorage.getItem(ukey(getSessionUserId(), 'margin_target')))
    return v >= MARGIN_MIN && v <= MARGIN_MAX ? v : MARGIN_DEFAULT
  } catch {
    return MARGIN_DEFAULT
  }
}

export function setMarginTarget(value) {
  try {
    localStorage.setItem(ukey(getSessionUserId(), 'margin_target'), String(value))
  } catch {}
}
