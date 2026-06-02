/**
 * Anthropic Claude API client — routed through the server-side proxy.
 *
 * Security: the API key is never embedded in the client bundle nor sent to a
 * third-party from the browser. Requests go to the same-origin Edge Function
 * `/api/chat`, which holds the key server-side (see api/chat.js).
 *
 * Optional per-user override: if a user pasted their own key in Settings, it is
 * sent to the proxy via the `x-user-api-key` header (stored only in their own
 * localStorage, never in the shipped bundle).
 */

const ENDPOINT     = '/api/chat'
const MAX_TOKENS   = 4096

const MODELS = {
  standard:    'claude-haiku-4-5-20251001',
  performance: 'claude-sonnet-4-6',
  ultra:       'claude-opus-4-8',
}

import { getSessionUserId, ukey } from '@/utils/userStorage'

// Optional personal key override (never required — the server holds the key).
function getUserApiKey() {
  try {
    const uid = getSessionUserId()
    return localStorage.getItem(ukey(uid, 'api_key')) || ''
  } catch {
    return ''
  }
}

// L'IA exige le réseau : message clair plutôt qu'un échec brut hors-ligne.
function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Connexion requise pour l’assistant IA. Reconnectez-vous puis réessayez.')
  }
}

// ── Résilience réseau ───────────────────────────────────────────────────────
// Timeout (AbortController) + retries à backoff exponentiel sur les seules
// erreurs transitoires. Les requêtes longues (recherche web) sont couvertes par
// un timeout généreux ; les flux ont en plus un garde d'inactivité.
const REQUEST_TIMEOUT_MS = 150000   // 2,5 min — couvre la recherche web en direct
const STREAM_IDLE_MS     = 70000    // abandon si aucun octet pendant 70 s
const MAX_RETRIES        = 2        // 3 tentatives au total
const RETRYABLE_STATUS   = new Set([408, 425, 429, 500, 502, 503, 504, 529])

const sleep   = (ms) => new Promise((r) => setTimeout(r, ms))
const backoff = (attempt) => Math.min(8000, 1000 * 2 ** attempt) // 1 s, 2 s, 4 s…

async function httpError(res) {
  const err = await res.json().catch(() => ({}))
  const e = new Error(err.error?.message ?? `Erreur du service IA (${res.status})`)
  e.status = res.status
  return e
}

/**
 * fetch avec timeout et retries. Ne réessaie QUE les transitoires (réseau,
 * timeout, 408/425/429/5xx). Les 4xx définitifs (400/401/403…) ne sont jamais
 * réessayés. Renvoie une Response OK ; sinon lève une Error explicite.
 */
async function fetchResilient(url, options, { timeoutMs = REQUEST_TIMEOUT_MS, retries = MAX_RETRIES } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    let res
    try {
      res = await fetch(url, { ...options, signal: ctrl.signal })
    } catch (e) {
      clearTimeout(timer)
      lastErr = e.name === 'AbortError'
        ? new Error('Le service IA met trop de temps à répondre. Réessayez dans un instant.')
        : new Error('Connexion au service IA interrompue. Vérifiez votre réseau puis réessayez.')
      if (attempt < retries) { await sleep(backoff(attempt)); continue }
      throw lastErr
    }
    clearTimeout(timer)
    if (res.ok) return res
    if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
      lastErr = await httpError(res)
      await sleep(backoff(attempt))
      continue
    }
    throw await httpError(res)
  }
  throw lastErr ?? new Error('Le service IA est indisponible. Réessayez dans un instant.')
}

/**
 * Lit un chunk d'un flux avec garde d'inactivité : si aucun octet n'arrive
 * pendant `idleMs`, on abandonne (le timeout global ne convient pas au
 * streaming, où la recherche web peut légitimement durer).
 */
async function readChunk(reader, idleMs = STREAM_IDLE_MS) {
  let timer
  const idle = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Le flux du service IA s’est interrompu. Réessayez.')), idleMs)
  })
  try {
    return await Promise.race([reader.read(), idle])
  } finally {
    clearTimeout(timer)
  }
}

// Builds request headers for the proxy, attaching the personal key only if set.
function proxyHeaders() {
  const headers = { 'content-type': 'application/json' }
  const userKey = getUserApiKey()
  if (userKey) headers['x-user-api-key'] = userKey
  // APP_SECRET: set via VITE_APP_SECRET in Vercel env. Present in the bundle
  // (Vite bakes VITE_* vars at build time) — raises the bar against scanners
  // without being a substitute for proper auth.
  const appSecret = import.meta.env.VITE_APP_SECRET
  if (appSecret) headers['x-app-secret'] = appSecret
  return headers
}

function getModel() {
  try {
    const uid = getSessionUserId()
    const power = localStorage.getItem(ukey(uid, 'ai_power')) || 'performance'
    return MODELS[power] || MODELS.performance
  } catch {
    return MODELS.performance
  }
}

const LANG_NAMES = { fr: 'French', en: 'English', de: 'German', it: 'Italian', es: 'Spanish' }

// Socle d'expertise partagé par tous les outils experts.
const EXPERT_BASE = `Core expertise (real French market, VN & VO):
- VN: manufacturer catalog prices France 2024/2025, trim/finition hierarchy and factory options, dealer discounts actually practised, delivery lead times, WLTP, CO₂ and malus écologique 2025.
- VO: Argus & La Centrale ratings, realistic prices by year / mileage / finition, depreciation curves at 1/2/3/5 years, supply-demand tension, mileage/condition/option/region adjustments.
- Commercial strategy: BtoB (flottes, TCO, fiscalité TVS, amortissement, récupération TVA) and BtoC (financement LOA/LLD, valeur résiduelle, garantie, malus).

AUTOBUYUNION business DNA (apply to every recommendation):
- Autobuyunion is a European purchasing group (centrale d'achat) buying VN/VO in volume directly from manufacturers (~45-60% below new price), importers and rental fleets (Buy Back), reselling cross-border in the EU to professional partners (concessionnaires multimarques, agents).
- Cotation method "premier prix du net": always anchor on the CHEAPEST current listing on La Centrale/LeBonCoin, never the average. The recommended partner sale price (TTC) must rank among the very first/cheapest listings ("1er du net").
- Margin structure on a deal: from the premier-prix-du-net TTC, remove ~20% VAT to get HT, then the deal must leave the partner ~3 000–4 000 € HT brut of margin (min 3 000 €) and ~1 000–1 500 € group margin; also account for ~450 € HT average transport cost per vehicle (borne by the partner, EU cross-border). The remainder is the pro purchase price. Minimum viable price gap on a deal ≈ 4 500–5 000 € (more on premium models, e.g. ~5 000 € on an X5).
- Partner value: vehicles "génératrices de marge", logistics handled, vehicle preparation handled, financing/portage up to 2 months. The partner just has to sell; we make sure he is positioned 1er du net.
- INTERNAL-ONLY (never disclose to partners in pitch/objection text): exact margin figures, transport costs, the names of any service provider / bodyshop / certifier (e.g. preparation or francisation partners). These are internal mechanics and a hallucination risk — keep partner-facing wording general.`

// Garde-fou anti-bullshit — partagé par TOUS les assistants (chat, expert,
// outils). Centralisé dans antiBullshit.js : noms propres inventés, outils/
// features inexistants, lois/taux fabriqués, annonces/sources fictives.
import { ANTI_BS, auditResponse } from './antiBullshit'
// Doctrine de vente maison + garde-fou confidentialité (sorties partenaire).
import { HOUSE_METHOD, NEVER_DISCLOSE } from './houseMethod'

const EXPERT_RULES = `Rules:
- Always give concrete, realistic figures (€, %, g/km, km) grounded in the real French market. Never invent implausible numbers; if uncertain, give a credible range and say it is an estimate.
- Distinguish VN vs VO whenever it changes the answer (pricing, décote, négociation).
- Be specific to the exact model AND finition requested — never generalise across variants.
- No filler, no vague formulas ("cela dépend…"): figures or an explicit "Données insuffisantes".
${ANTI_BS}`

// Personas dédiés par outil — élèvent la pertinence au niveau d'un échange direct.
// Le FORMAT de sortie (JSON/Markdown) reste piloté par le prompt utilisateur de chaque page.
const TOOL_PERSONAS = {
  pitch: `You are an automotive sales expert with 15 years of field experience (VN, VO, BtoB fleet) for Autobuyunion. You craft punchy sales pitches usable instantly in a meeting, on the phone or in a rep briefing. BtoB = figures + process & ROI; BtoC = emotion + concrete usage. Cite real PRODUCT data only (autonomy km, boot L, ch, WLTP, lead time, LOA/LLD monthly, TCO, recoverable VAT, malus). For BtoB partners, weave in the value proposition in GENERAL, SAFE terms: "centrale d'achat européenne flexible", véhicules génératrices de marge (positionnement 1er du net, marge attractive laissée au partenaire), logistique gérée, portage/encours jusqu'à 2 mois — "le partenaire n'a qu'à signer la traite". Never lead with price; build the economic case first.

${HOUSE_METHOD}

${NEVER_DISCLOSE}`,

  veilleprix: `You are a senior automotive pricing analyst for Autobuyunion, French VN/VO market 2024-2025. You master Argus, La Centrale, AutoScout24, LeBonCoin Pro ratings, manufacturer depreciation, LLD residual values and BtoB taxation. Prices are realistic, expressed HT and TTC. Never invent an unavailable rating: give a credible range and label it an estimate. If live web sources are unavailable, rely on your market knowledge and say so.

CRITICAL PRICING PHILOSOPHY: Autobuyunion partners must ALWAYS position among the most competitive prices online ("premiers du net"). Your job is to find the CHEAPEST real listings on the market, not compute a high average. Identify the top 10–20% lowest-priced listings, and recommend sale prices that place partners among the most attractive offers visible to buyers on La Centrale, LeBonCoin, AutoScout24. Partners buy pro at low HT prices and must pass those savings on as competitive TTC sale prices. Never recommend mid-market or above-average positioning.`,

  objections: `You are an expert sales trainer for Autobuyunion (BtoB partners: concessionnaires multimarques, agents). You handle partner objections the house way, with SHORT spoken answers ready to say on the phone (2-4 sentences each) — concision limits hallucination risk.

${HOUSE_METHOD}

${NEVER_DISCLOSE}`,

  comparateur: `You are an independent automotive purchase-decision consultant for Autobuyunion. You produce objective, figure-based comparisons for customers hesitating between two models. Always end on a clear-cut verdict — never "both are equivalent". French BtoB taxation aware (TVS, declining-balance depreciation, VU VAT). Unknown data = "NC", never invented.`,

  analysemarche: `You are a senior automotive market analyst for Autobuyunion, French market 2024-2025. You cover precise segment positioning, market share, current trends (ZFE, electrification, supply tension, weight malus) and commercial opportunities. If recent data is unavailable, state the reference year used. Never generalise.`,

  rapportcommercial: `You are a commercial automotive expert for Autobuyunion. You write professional sales summaries ready to send to a customer or use as an internal brief. Professional yet accessible tone, no opaque jargon, no spelling mistakes.`,

  ficheIA: `You are an expert automotive product copywriter for Autobuyunion, French market. Use official manufacturer specs only. Unknown data = "[Selon version]", never invented. The sheet must be usable as-is by a non-technical salesperson.`,
}

/**
 * @param {string} lang
 * @param {boolean} expert
 * @param {string|null} tool — clé persona : pitch|veilleprix|objections|comparateur|analysemarche|rapportcommercial|ficheIA
 */
function buildSystemPrompt(lang = 'fr', expert = false, tool = null) {
  const langName = LANG_NAMES[lang] || 'French'

  if (tool && TOOL_PERSONAS[tool]) {
    return `${TOOL_PERSONAS[tool]}

${EXPERT_BASE}

${EXPERT_RULES}
- Respond entirely in ${langName}.
- The user message defines the exact output format (JSON schema or sections): follow it strictly.`
  }

  if (expert) {
    return `You are a senior automotive market analyst and sales strategist for Autobuyunion, a European automotive purchasing group. You serve professional sales teams; your output must be expert-grade, precise and directly usable.

${EXPERT_BASE}

${EXPERT_RULES}
- Respond entirely in ${langName}.`
  }

  // Mode chat — réponses courtes, chiffrées, actionnables.
  return `You are the sales assistant of Autobuyunion, Europe's leading automotive purchasing group, specialised in BtoB and BtoC vehicle sales on the French market. You master VN (new) and VO (used): catalog prices, dealer discounts, Argus/La Centrale ratings, depreciation, CO₂/malus, TCO.
Rules:
- Short answers: 4 to 6 lines maximum.
- Always include at least one concrete figure (price, %, km, lead time, saving).
- Bullet points when there are more than 2 facts.
- Never use generic formulas ("cela dépend…", "il faut considérer…").
- If the question needs real-time pricing, mention the Veille Prix tool; for vehicle comparison, the Comparateur; for CO₂/malus, the CO₂ & Malus calculator; for TCO, the Calculateur TCO.
- Always respond in ${langName}.
${ANTI_BS}`
}

/**
 * @typedef {object} Attachment
 * @property {string} name    — original file name
 * @property {string} type    — MIME type ('application/pdf' or 'image/*')
 * @property {string} base64  — file content base64-encoded (no data: prefix)
 *
 * @typedef {object} ChatMessage
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {Attachment?} [attachment]
 */


/**
 * Builds a single message's content payload, with optional file attachment.
 *
 * Anthropic's API accepts either a plain string OR an array of content blocks.
 * We return the simplest valid shape for the inputs given.
 *
 * @param {string} text
 * @param {Attachment|null} attachment
 * @returns {string|Array<object>}
 */
function buildContent(text, attachment) {
  if (!attachment) return text || ''

  const blocks = []

  if (attachment.type === 'application/pdf') {
    blocks.push({
      type:   'document',
      source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 },
    })
  } else if (attachment.type.startsWith('image/')) {
    blocks.push({
      type:   'image',
      source: { type: 'base64', media_type: attachment.type, data: attachment.base64 },
    })
  }

  if (text) blocks.push({ type: 'text', text })
  return blocks
}

/**
 * Sends a list of chat messages to Claude and returns the assistant text.
 *
 * @param {ChatMessage[]} messages
 * @returns {Promise<string>}
 */
export async function sendMessage(messages, { lang = 'fr', maxTokens = MAX_TOKENS, expert = false, temperature = 0.3, tool = null, webSearch = false, maxSearches = 5, returnMeta = false, stream = false, onChunk = null } = {}) {
  assertOnline()
  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const body = {
    model:       getModel(),
    max_tokens:  maxTokens,
    temperature,
    system:      buildSystemPrompt(lang, expert, tool),
    messages:    apiMessages,
  }
  // Pont vers la recherche web officielle (exécutée côté serveur,
  // jamais bloquée comme un proxy navigateur). Le modèle décide quand chercher.
  if (webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches }]
  }

  // Streaming interne : pour les requêtes longues (recherche web en direct),
  // on stream la réponse afin que des octets circulent en continu. Sans cela,
  // la passerelle coupe une requête non-streamée trop longue → 504. Le texte
  // est accumulé puis renvoyé comme si la requête était classique.
  if (stream || webSearch) {
    body.stream = true
    return streamToText(body, { returnMeta, onChunk })
  }

  const response = await fetchResilient(ENDPOINT, {
    method:  'POST',
    headers: proxyHeaders(),
    body: JSON.stringify(body),
  })

  const payload = await response.json()
  const blocks = payload.content || []
  // Concatène tous les blocs texte (la recherche web insère des blocs
  // server_tool_use / web_search_tool_result entre les textes).
  const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
  if (!text) throw new Error('Unexpected API response (no text content).')
  auditResponse(text, tool || (expert ? 'expert' : 'chat'))

  if (returnMeta) {
    const searchCount = blocks.filter(b => b.type === 'server_tool_use' && b.name === 'web_search').length
    return { text, usedWebSearch: searchCount > 0, searchCount }
  }
  return text
}

/**
 * Envoie une requête en streaming SSE et accumule le texte complet.
 * Garde la connexion vivante (octets en continu) pour éviter les 504 sur les
 * requêtes longues, tout en renvoyant un résultat équivalent au mode classique.
 *
 * @param {object} body — corps de requête (avec stream:true)
 * @param {{ returnMeta?: boolean }} opts
 * @returns {Promise<string|{text:string,usedWebSearch:boolean,searchCount:number}>}
 */
/**
 * Repli NON-STREAMING. Si le flux échoue (ex. iOS Safari « Load failed »,
 * `response.body` non lisible, flux coupé), on rejoue la requête SANS stream :
 * le proxy renvoie alors le JSON complet d'un coup. Garantit un résultat même
 * quand le streaming casse côté navigateur.
 */
async function postNonStream(body) {
  const { stream: _omitStream, ...rest } = body
  const response = await fetchResilient(ENDPOINT, {
    method:  'POST',
    headers: proxyHeaders(),
    body: JSON.stringify(rest),
  })
  const payload = await response.json()
  const blocks = payload.content || []
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  const searchCount = blocks.filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length
  return { text, searchCount }
}

async function streamToText(body, { returnMeta = false, onChunk = null } = {}) {
  let text = ''
  let searchCount = 0

  try {
    const response = await fetchResilient(ENDPOINT, {
      method:  'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    })
    const reader = response.body?.getReader()
    if (!reader) throw new Error('stream-unavailable')
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await readChunk(reader)
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue
        try {
          const evt = JSON.parse(data)
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            text += evt.delta.text
            onChunk?.(text)
          } else if (evt.type === 'content_block_start'
                     && evt.content_block?.type === 'server_tool_use'
                     && evt.content_block?.name === 'web_search') {
            searchCount += 1
          }
        } catch { /* skip malformed SSE events */ }
      }
    }
    text = text.trim()
    if (!text) throw new Error('stream-empty')
  } catch {
    // Streaming KO → repli non-streamé (résultat complet d'un coup).
    const r = await postNonStream(body)
    text = r.text
    searchCount = r.searchCount
    onChunk?.(text)
  }

  if (!text) throw new Error('Unexpected API response (no text content).')
  auditResponse(text, 'stream')
  if (returnMeta) return { text, usedWebSearch: searchCount > 0, searchCount }
  return text
}

/**
 * Streams a chat response from Claude, calling onChunk with the accumulated
 * text after each token so the UI can update in real time.
 *
 * @param {ChatMessage[]} messages
 * @param {{ lang?: string, onChunk?: (text: string) => void }} opts
 * @returns {Promise<string>}  the complete assistant text
 */
export async function streamMessage(messages, { lang = 'fr', onChunk, temperature = 0.6, webSearch = false, maxSearches = 3 } = {}) {
  assertOnline()
  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const body = {
    model:       getModel(),
    max_tokens:  MAX_TOKENS,
    temperature,
    system:      buildSystemPrompt(lang),
    messages:    apiMessages,
    stream:      true,
  }
  if (webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches }]
  }

  let fullText = ''
  try {
    const response = await fetchResilient(ENDPOINT, {
      method:  'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    })
    const reader = response.body?.getReader()
    if (!reader) throw new Error('stream-unavailable')
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await readChunk(reader)
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue
        try {
          const evt = JSON.parse(data)
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullText += evt.delta.text
            onChunk?.(fullText)
          }
        } catch { /* skip malformed SSE events */ }
      }
    }
    if (!fullText.trim()) throw new Error('stream-empty')
  } catch {
    // Streaming KO (ex. iOS Safari « Load failed ») → repli non-streamé :
    // on récupère le texte complet d'un coup et on l'affiche en une fois.
    const r = await postNonStream(body)
    fullText = r.text
    onChunk?.(fullText)
  }

  auditResponse(fullText, 'chat')
  return fullText
}

/**
 * Extracts the first JSON block from a free-form Claude response.
 * Useful for tools that ask Claude to return structured data inside prose.
 *
 * @param {string} raw       — raw text from sendMessage()
 * @param {'array'|'object'} kind — which shape to extract
 * @returns {unknown}
 * @throws  {Error} if no valid JSON is found
 */
export function extractJSON(raw, kind = 'array') {
  if (typeof raw !== 'string') throw new Error('Invalid AI response: no JSON detected.')

  // 1) Nettoyage : retire les fences markdown ```json … ```
  let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

  const open = kind === 'array' ? '[' : '{'
  const close = kind === 'array' ? ']' : '}'
  const start = s.indexOf(open)
  if (start < 0) throw new Error('Invalid AI response: no JSON detected.')
  s = s.slice(start)

  // 2) Tentative directe
  try { return JSON.parse(s) } catch { /* continue */ }

  // 3) Plus longue correspondance équilibrée (du 1er ouvrant au dernier fermant)
  const lastClose = s.lastIndexOf(close)
  if (lastClose > 0) {
    try { return JSON.parse(s.slice(0, lastClose + 1)) } catch { /* continue */ }
  }

  // 4) Réparation d'une réponse tronquée (max_tokens atteint) :
  //    on coupe au dernier élément complet puis on referme les structures.
  let repaired = s
  if (kind === 'array') {
    const lastObj = s.lastIndexOf('}')
    if (lastObj > 0) repaired = s.slice(0, lastObj + 1) + ']'
  } else {
    // objet : on coupe après la dernière valeur complète (" , } ])
    const lastSafe = Math.max(s.lastIndexOf('"'), s.lastIndexOf('}'), s.lastIndexOf(']'))
    if (lastSafe > 0) {
      repaired = s.slice(0, lastSafe + 1).replace(/,\s*$/, '')
      // referme les accolades/crochets ouverts non fermés
      const opens = (repaired.match(/\{/g) || []).length + (repaired.match(/\[/g) || []).length
      const closes = (repaired.match(/\}/g) || []).length + (repaired.match(/\]/g) || []).length
      repaired += '}'.repeat(Math.max(0, opens - closes))
    }
  }
  try { return JSON.parse(repaired) } catch { /* continue */ }

  throw new Error('Invalid AI response: malformed JSON.')
}
