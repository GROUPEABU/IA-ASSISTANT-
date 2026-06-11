/**
 * Suivi du coût API estimé par outil — stocké localement (par utilisateur),
 * affiché dans Paramètres. Aucun envoi externe : pure lecture du champ `usage`
 * renvoyé par l'API à chaque réponse.
 *
 * Tarifs au 2026-06 ($/M tokens) :
 *   Sonnet 4.6  : in 3,00 · out 15,00 · cache-write 3,75 · cache-read 0,30
 *   Haiku 4.5   : in 1,00 · out  5,00 · cache-write 1,25 · cache-read 0,10
 *   Opus 4.8    : in 5,00 · out 25,00 · cache-write 6,25 · cache-read 0,50
 *   Recherche web : 0,01 $ / requête
 */
import { getSessionUserId, ukey } from './userStorage'

const PRICING = {
  'claude-sonnet-4-6':        { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-haiku-4-5-20251001':{ in: 1.00, out:  5.00, cw: 1.25, cr: 0.10 },
  'claude-opus-4-8':          { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
}
const SEARCH_COST = 0.01

const SUFFIX = 'api_costs'

function costKey() {
  try { return ukey(getSessionUserId(), SUFFIX) } catch { return `abu_anon_${SUFFIX}` }
}

export function computeCost(model, usage = {}, searchCount = 0) {
  const p = PRICING[model] || PRICING['claude-sonnet-4-6']
  return (
    ((usage.input_tokens                 || 0) / 1e6) * p.in  +
    ((usage.output_tokens                || 0) / 1e6) * p.out +
    ((usage.cache_creation_input_tokens  || 0) / 1e6) * p.cw  +
    ((usage.cache_read_input_tokens      || 0) / 1e6) * p.cr  +
    searchCount * SEARCH_COST
  )
}

export function trackCost(tool, model, usage = {}, searchCount = 0) {
  try {
    const key = costKey()
    const data = JSON.parse(localStorage.getItem(key) || '{}')
    const t = tool || 'chat'
    const cost = computeCost(model, usage, searchCount)
    if (!data[t]) data[t] = { calls: 0, cost: 0 }
    data[t].calls += 1
    data[t].cost  += cost
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

export function getCosts() {
  try { return JSON.parse(localStorage.getItem(costKey()) || '{}') } catch { return {} }
}

export function resetCosts() {
  try { localStorage.removeItem(costKey()) } catch {}
}
