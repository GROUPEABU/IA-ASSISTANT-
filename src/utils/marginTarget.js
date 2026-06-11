/**
 * Marge partenaire cible (€ HT) — réglée depuis la Veille Prix (recherche +
 * import fichier). Défaut 3 000 € HT : tant qu'on ne touche pas au champ, le
 * prompt Veille Prix utilise ce montant ; toute valeur saisie est injectée
 * dans buildPrompt (modification validée par l'utilisateur).
 */
import { getSessionUserId, ukey } from './userStorage'

export const MARGIN_DEFAULT = 3000
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
