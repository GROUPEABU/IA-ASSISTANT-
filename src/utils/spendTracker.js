/**
 * Suivi des dépenses IA par utilisateur — plafond mensuel + quotidien.
 * Stocké en localStorage (par utilisateur, par période) — aucun envoi externe.
 * Les périodes expirées (anciens mois/jours) sont ignorées automatiquement.
 */
import { ukey } from './userStorage'

export const MONTHLY_CAP = 25  // €/mois
export const DAILY_CAP   = 2   // €/jour

function monthKey() { return new Date().toISOString().slice(0, 7)  } // '2026-06'
function dayKey()   { return new Date().toISOString().slice(0, 10) } // '2026-06-15'

const mk = (uid) => ukey(uid, `spend_m_${monthKey()}`)
const dk = (uid) => ukey(uid, `spend_d_${dayKey()}`)

export function getSpend(uid) {
  if (uid == null) return { month: 0, day: 0 }
  try {
    return {
      month: parseFloat(localStorage.getItem(mk(uid)) || '0'),
      day:   parseFloat(localStorage.getItem(dk(uid)) || '0'),
    }
  } catch { return { month: 0, day: 0 } }
}

export function addSpend(uid, amount) {
  if (uid == null || !(amount > 0)) return
  try {
    const mkey = mk(uid), dkey = dk(uid)
    localStorage.setItem(mkey, (parseFloat(localStorage.getItem(mkey) || '0') + amount).toFixed(6))
    localStorage.setItem(dkey, (parseFloat(localStorage.getItem(dkey) || '0') + amount).toFixed(6))
    // Notifie l'UI (jauge sidebar) sans recharger la page.
    try { window.dispatchEvent(new Event('abu:spend')) } catch { /* SSR/no-op */ }
  } catch {}
}

export function checkLimits(uid) {
  if (uid == null) return { ok: true }
  const { month, day } = getSpend(uid)
  if (month >= MONTHLY_CAP) return { ok: false, reason: 'monthly', spent: month, cap: MONTHLY_CAP }
  if (day   >= DAILY_CAP)   return { ok: false, reason: 'daily',   spent: day,   cap: DAILY_CAP   }
  return { ok: true }
}

/**
 * Migration one-shot depuis l'ancien compteur `api_costs`.
 * Si les jauges sont à 0 et qu'un total historique existe, on l'injecte
 * dans le mois + jour courants — une seule fois grâce au flag `quota_migrated_v1`.
 */
export function migrateToQuota(uid, legacyTotal) {
  if (uid == null || !(legacyTotal > 0)) return
  try {
    const flagKey = ukey(uid, 'quota_migrated_v1')
    if (localStorage.getItem(flagKey)) return   // déjà fait
    addSpend(uid, legacyTotal)
    localStorage.setItem(flagKey, '1')
  } catch {}
}

export function quotaErrorMessage(reason) {
  if (reason === 'monthly')
    return `Limite mensuelle de ${MONTHLY_CAP} € atteinte. Votre quota se réinitialise le 1er du mois prochain.`
  return `Limite quotidienne de ${DAILY_CAP} € atteinte. Votre quota se réinitialise à minuit.`
}
