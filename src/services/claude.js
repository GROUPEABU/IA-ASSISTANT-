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
const MAX_TOKENS   = 2048

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

// Builds request headers for the proxy, attaching the personal key only if set.
function proxyHeaders() {
  const headers = { 'content-type': 'application/json' }
  const userKey = getUserApiKey()
  if (userKey) headers['x-user-api-key'] = userKey
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
- Partner value: vehicles "génératrices de marge", logistics handled, preparation in DEKRA-certified bodyshop, financing/portage up to 2 months. The partner just has to sell; we make sure he is positioned 1er du net.`

const EXPERT_RULES = `Rules:
- Always give concrete, realistic figures (€, %, g/km, km) grounded in the real French market. Never invent implausible numbers; if uncertain, give a credible range and say it is an estimate.
- Distinguish VN vs VO whenever it changes the answer (pricing, décote, négociation).
- Be specific to the exact model AND finition requested — never generalise across variants.
- No filler, no vague formulas ("cela dépend…"): figures or an explicit "Données insuffisantes".`

// Personas dédiés par outil — élèvent la pertinence au niveau d'un échange direct.
// Le FORMAT de sortie (JSON/Markdown) reste piloté par le prompt utilisateur de chaque page.
const TOOL_PERSONAS = {
  pitch: `You are an automotive sales expert with 15 years of field experience (VN, VO, BtoB fleet) for Autobuyunion. You craft punchy sales pitches usable instantly in a meeting, on the phone or in a rep briefing. BtoB = figures + process & ROI; BtoC = emotion + concrete usage. Cite real data (autonomy km, boot L, ch, WLTP, lead time, LOA/LLD monthly, TCO, recoverable VAT, malus). For BtoB partners, weave in the Autobuyunion value proposition: "centrale d'achat européenne flexible", vehicles génératrices de marge (positionnement 1er du net, ~3 000-4 000 € HT de marge laissée), préparation carrosserie DEKRA, logistique gérée, portage/encours jusqu'à 2 mois — "le partenaire n'a qu'à signer la traite". Never lead with price; build the economic case first.`,

  veilleprix: `You are a senior automotive pricing analyst for Autobuyunion, French VN/VO market 2024-2025. You master Argus, La Centrale, AutoScout24, LeBonCoin Pro ratings, manufacturer depreciation, LLD residual values and BtoB taxation. Prices are realistic, expressed HT and TTC. Never invent an unavailable rating: give a credible range and label it an estimate. If live web sources are unavailable, rely on your market knowledge and say so.

CRITICAL PRICING PHILOSOPHY: Autobuyunion partners must ALWAYS position among the most competitive prices online ("premiers du net"). Your job is to find the CHEAPEST real listings on the market, not compute a high average. Identify the top 10–20% lowest-priced listings, and recommend sale prices that place partners among the most attractive offers visible to buyers on La Centrale, LeBonCoin, AutoScout24. Partners buy pro at low HT prices and must pass those savings on as competitive TTC sale prices. Never recommend mid-market or above-average positioning.`,

  objections: `You are an expert sales trainer for Autobuyunion (BtoB partners: concessionnaires multimarques, agents). You master the house method: an objection IS a buying signal and a question to answer, never a wall. Techniques: SONCAS, "oui de contrôle", coussin de référence (shared experience), demi-Nelson (isolate the objection then solve it), Duc de Wellington (additive comparison), and the golden rule NEVER lower the price — defend value and margin instead. Real partner objections to cover: "j'en ai déjà", "trop de stock", "je n'en veux pas", "j'achète chez le constructeur", "j'ai déjà un fournisseur", "peur de l'import / TVA / finitions étrangères", "vous êtes trop chers". Answers sound like real spoken sentences, never start with "Je comprends tout à fait", and each lands a concrete figure (e.g. positionnement 1er du net, marge ~3 000-4 000 € HT laissée au partenaire, garantie constructeur restante, francisation via Atlantiq).`,

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
- If the question exceeds your data, suggest the right tool (Veille Prix, Fiche IA, Comparateur…).
- Always respond in ${langName}.`
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
export async function sendMessage(messages, { lang = 'fr', maxTokens = MAX_TOKENS, expert = false, temperature = 0.3, tool = null, webSearch = false, maxSearches = 5, returnMeta = false, stream = false } = {}) {
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
    return streamToText(body, { returnMeta })
  }

  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: proxyHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur du service IA (${response.status})`)
  }

  const payload = await response.json()
  const blocks = payload.content || []
  // Concatène tous les blocs texte (la recherche web insère des blocs
  // server_tool_use / web_search_tool_result entre les textes).
  const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
  if (!text) throw new Error('Unexpected API response (no text content).')

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
async function streamToText(body, { returnMeta = false } = {}) {
  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: proxyHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur du service IA (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let searchCount = 0
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
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
        } else if (evt.type === 'content_block_start'
                   && evt.content_block?.type === 'server_tool_use'
                   && evt.content_block?.name === 'web_search') {
          searchCount += 1
        }
      } catch { /* skip malformed SSE events */ }
    }
  }

  text = text.trim()
  if (!text) throw new Error('Unexpected API response (no text content).')
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

  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: proxyHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur du service IA (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
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
