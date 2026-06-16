// Quota de dépense AUTORITAIRE côté serveur — attaché à l'identité du compte
// (id de session), partagé entre tous les appareils/sessions d'un même compte
// (ex. le compte démo). Incontournable côté client : le navigateur ne peut plus
// minorer son usage en vidant son localStorage.
//
// Stockage : Upstash Redis REST (compatible Vercel KV), appelé en HTTP depuis
// le runtime Edge. Variables d'environnement acceptées (Vercel KV ou Upstash) :
//   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel KV / Marketplace)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//
// DÉGRADATION GRACIEUSE : si aucune variable n'est configurée, toutes les
// fonctions deviennent inertes (quotaEnabled() = false) et api/chat.js retombe
// sur le contrôle déclaratif historique. L'app fonctionne donc sans KV.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''

// TTL des clés de période — auto-nettoyage des mois/jours révolus.
const MONTH_TTL_S = 40 * 24 * 60 * 60 // ~40 j (couvre tout le mois + marge)
const DAY_TTL_S   = 3  * 24 * 60 * 60 // ~3 j

// Tarifs alignés sur src/utils/apiCost.js ($/M tokens, 2026-06).
const PRICING = {
  'claude-sonnet-4-6':         { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-haiku-4-5-20251001': { in: 1.00, out:  5.00, cw: 1.25, cr: 0.10 },
  'claude-opus-4-8':           { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
}
const SEARCH_COST = 0.01

export function quotaEnabled() {
  return Boolean(REST_URL && REST_TOKEN)
}

/**
 * Contrôle de santé : ping réel du KV pour confirmer URL + token valides.
 * N'expose aucun secret. @returns {Promise<{ ok: boolean, reason: string }>}
 */
export async function pingKV() {
  if (!quotaEnabled()) return { ok: false, reason: 'not_configured' }
  try {
    const out = await pipeline([['PING']])
    return out?.[0]?.result === 'PONG'
      ? { ok: true, reason: 'connected' }
      : { ok: false, reason: 'unexpected_response' }
  } catch {
    return { ok: false, reason: 'unreachable_or_bad_token' }
  }
}

// Clés UTC (mêmes découpages que le client : toISOString slice).
function monthKey(uid) { return `abuq:${uid}:m:${new Date().toISOString().slice(0, 7)}` }
function dayKey(uid)   { return `abuq:${uid}:d:${new Date().toISOString().slice(0, 10)}` }

async function pipeline(commands) {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`KV ${res.status}`)
  return res.json() // [{ result: ... }, ...]
}

/** Dépense courante du compte (mois + jour). @returns {Promise<{month:number,day:number}>} */
export async function readSpend(uid) {
  if (!quotaEnabled() || uid == null) return { month: 0, day: 0 }
  try {
    const out = await pipeline([['GET', monthKey(uid)], ['GET', dayKey(uid)]])
    return {
      month: parseFloat(out?.[0]?.result || '0') || 0,
      day:   parseFloat(out?.[1]?.result || '0') || 0,
    }
  } catch {
    // KV injoignable : on ne bloque pas l'utilisateur sur une panne d'infra.
    return { month: 0, day: 0 }
  }
}

/** Incrémente la dépense du compte (best-effort, ne lève jamais). */
export async function addSpend(uid, amount) {
  if (!quotaEnabled() || uid == null || !(amount > 0)) return
  const amt = amount.toFixed(6)
  try {
    await pipeline([
      ['INCRBYFLOAT', monthKey(uid), amt], ['EXPIRE', monthKey(uid), MONTH_TTL_S],
      ['INCRBYFLOAT', dayKey(uid),   amt], ['EXPIRE', dayKey(uid),   DAY_TTL_S],
    ])
  } catch { /* best-effort */ }
}

/**
 * Importe UNE FOIS une dépense historique (estimation locale pré-KV) dans le
 * compteur du compte, pour qu'elle apparaisse sur tous les appareils.
 * Idempotent via un flag atomique SET NX : seul le premier appel non nul est
 * pris en compte ; les suivants sont ignorés. Non abusable (n'augmente que la
 * propre dépense du compte).
 * @returns {Promise<{ seeded: boolean, already?: boolean }>}
 */
export async function seedSpend(uid, amount) {
  if (!quotaEnabled() || uid == null || !(amount > 0)) return { seeded: false }
  try {
    const flag = `abuq:${uid}:seed`
    // SET NX : pose le flag seulement s'il n'existe pas encore (atomique).
    const out = await pipeline([['SET', flag, '1', 'NX', 'EX', String(MONTH_TTL_S)]])
    if (out?.[0]?.result !== 'OK') return { seeded: false, already: true }
    await addSpend(uid, amount)
    return { seeded: true }
  } catch {
    return { seeded: false }
  }
}

/** Coût estimé d'un appel (identique à la formule client). */
export function computeCost(model, usage = {}, searchCount = 0) {
  const p = PRICING[model] || PRICING['claude-sonnet-4-6']
  return (
    ((usage.input_tokens                || 0) / 1e6) * p.in +
    ((usage.output_tokens               || 0) / 1e6) * p.out +
    ((usage.cache_creation_input_tokens || 0) / 1e6) * p.cw +
    ((usage.cache_read_input_tokens     || 0) / 1e6) * p.cr +
    (searchCount || 0) * SEARCH_COST
  )
}

/**
 * Extrait l'usage réel d'une réponse Anthropic (SSE en streaming OU JSON brut).
 * input/cache tokens viennent du début (message_start) ; output_tokens final
 * est la DERNIÈRE valeur (message_delta cumulatif). searchCount = nb de blocs
 * de résultat de recherche web.
 * @returns {{ usage: object, searchCount: number }}
 */
export function parseUsageFromText(text) {
  const firstInt = (re) => { const m = re.exec(text); return m ? parseInt(m[1], 10) : 0 }
  const lastInt  = (re) => { let m, last = 0; const g = new RegExp(re, 'g'); while ((m = g.exec(text))) last = parseInt(m[1], 10); return last }
  const searchCount = (text.match(/"web_search_tool_result"/g) || []).length
  return {
    usage: {
      input_tokens:                firstInt(/"input_tokens":(\d+)/),
      cache_creation_input_tokens: firstInt(/"cache_creation_input_tokens":(\d+)/),
      cache_read_input_tokens:     firstInt(/"cache_read_input_tokens":(\d+)/),
      output_tokens:               lastInt('"output_tokens":(\\d+)'),
    },
    searchCount,
  }
}

/**
 * Enveloppe le flux de réponse upstream : forwarde chaque octet INCHANGÉ au
 * client et, en fin de flux, mesure l'usage réel puis incrémente le quota du
 * compte. La mesure est best-effort et ne peut jamais corrompre le flux.
 * Fenêtres bornées (head/tail) pour ne pas charger toute la réponse en mémoire.
 */
export function meterStream(body, uid, model) {
  const reader  = body.getReader()
  const decoder = new TextDecoder()
  let head = '', tail = ''
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          try {
            const { usage, searchCount } = parseUsageFromText(`${head}\n${tail}`)
            const cost = computeCost(model, usage, searchCount)
            if (cost > 0) await addSpend(uid, cost)
          } catch { /* mesure best-effort */ }
          controller.close()
          return
        }
        controller.enqueue(value) // octets transmis tels quels
        try {
          const chunk = decoder.decode(value, { stream: true })
          if (head.length < 16384) head += chunk
          tail = (tail + chunk).slice(-16384)
        } catch { /* décodage best-effort */ }
      } catch (err) {
        controller.error(err)
      }
    },
    cancel(reason) { try { reader.cancel(reason) } catch { /* no-op */ } },
  })
}
