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

// Modèle par outil — prioritaire sur le réglage utilisateur.
// Sonnet : données web fiables + raisonnement prix (méthodo de référence) · Haiku : JSON rapide
const TOOL_MODELS = {
  veilleprix:        'claude-sonnet-4-6',
  ficheIA:           'claude-sonnet-4-6',
  analysemarche:     'claude-sonnet-4-6',
  comparateur:       'claude-sonnet-4-6',
  objections:        'claude-haiku-4-5-20251001',
  pitch:             'claude-haiku-4-5-20251001',
  rapportcommercial: 'claude-haiku-4-5-20251001',
  analysestock:      'claude-sonnet-4-6',
  importsmart:       'claude-haiku-4-5-20251001',
  logistique:        'claude-sonnet-4-6',
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
const STREAM_IDLE_MS     = 110000   // abandon si aucun octet pendant 110 s (laisse le temps à plusieurs recherches web d'enchaîner sans déclencher le repli)
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

function getModel(tool = null) {
  if (tool && TOOL_MODELS[tool]) return TOOL_MODELS[tool]
  try {
    const uid = getSessionUserId()
    const power = localStorage.getItem(ukey(uid, 'ai_power')) || 'performance'
    return MODELS[power] || MODELS.performance
  } catch {
    return MODELS.performance
  }
}

// Garde-fou anti-bullshit côté client (dev only) — les prompts sensibles vivent
// dans api/chat.js côté serveur et n'apparaissent jamais dans le bundle.
import { auditResponse } from './antiBullshit'
// Suivi coût API par outil (estimation locale, aucun envoi externe).
import { trackCost } from '@/utils/apiCost'

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
export async function sendMessage(messages, { lang = 'fr', maxTokens = MAX_TOKENS, expert = false, temperature = 0.3, tool = null, systemStaticKey = null, webSearch = false, webFetch = false, maxSearches = 5, returnMeta = false, stream = false, onChunk = null } = {}) {
  assertOnline()
  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const model = getModel(tool)

  // Le system prompt est construit côté serveur (api/chat.js) à partir de ces
  // identifiants — les textes sensibles ne transitent jamais dans le bundle.
  const body = {
    model,
    max_tokens:   maxTokens,
    _tool:            tool,
    _lang:            lang,
    _expert:          expert,
    _systemStaticKey: systemStaticKey,
    messages:     apiMessages,
  }
  // Opus 4.8 a déprécié `temperature` (l'API rejette la requête). On ne
  // l'envoie que pour les modèles qui l'acceptent encore (Sonnet, Haiku).
  if (!model.startsWith('claude-opus-4-8')) {
    body.temperature = temperature
  }
  // Pont vers la recherche web officielle (exécutée côté serveur,
  // jamais bloquée comme un proxy navigateur). Le modèle décide quand chercher.
  // web_fetch récupère le CONTENU RÉEL d'une URL fournie (≠ extraits de
  // recherche) — c'est ce que fait Claude chat quand on colle un lien.
  if (webSearch || webFetch) {
    body.tools = []
    if (webFetch) body.tools.push({ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: maxSearches })
    if (webSearch) body.tools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches })
  }

  // Streaming interne : pour les requêtes longues (recherche web en direct),
  // on stream la réponse afin que des octets circulent en continu. Sans cela,
  // la passerelle coupe une requête non-streamée trop longue → 504. Le texte
  // est accumulé puis renvoyé comme si la requête était classique.
  if (stream || webSearch || webFetch) {
    body.stream = true
    return streamToText(body, { returnMeta, onChunk, tool })
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
  if (payload.usage) trackCost(tool || 'chat', model, payload.usage, 0)

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
  return { text, searchCount, usage: payload.usage || {} }
}

async function streamToText(body, { returnMeta = false, onChunk = null, tool = null } = {}) {
  let text = ''
  let searchCount = 0
  let inputTokens = 0, outputTokens = 0, cacheCreateTokens = 0, cacheReadTokens = 0

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
          } else if (evt.type === 'message_start') {
            const u = evt.message?.usage || {}
            inputTokens      = u.input_tokens                || 0
            cacheCreateTokens = u.cache_creation_input_tokens || 0
            cacheReadTokens  = u.cache_read_input_tokens      || 0
          } else if (evt.type === 'message_delta') {
            outputTokens = evt.usage?.output_tokens || outputTokens
          }
        } catch { /* skip malformed SSE events */ }
      }
    }
    text = text.trim()
    if (!text) throw new Error('stream-empty')
  } catch {
    // Repli non-streamé UNIQUEMENT si rien n'a été reçu. Si du texte a
    // été partiellement reçu, on l'utilise tel quel : rejouer facturerait
    // deux fois la même analyse (l'API a déjà calculé la réponse).
    if (!text.trim()) {
      const r = await postNonStream(body)
      text = r.text
      searchCount = r.searchCount
      onChunk?.(text)
      // Usage disponible depuis la réponse JSON du repli
      if (r.usage?.input_tokens) {
        inputTokens       = r.usage.input_tokens                || 0
        outputTokens      = r.usage.output_tokens               || 0
        cacheCreateTokens = r.usage.cache_creation_input_tokens || 0
        cacheReadTokens   = r.usage.cache_read_input_tokens     || 0
      }
    }
  }

  if (!text) throw new Error('Unexpected API response (no text content).')
  auditResponse(text, 'stream')
  // Suivi coût (best-effort : usage peut être 0 si le repli n'a pas retourné d'usage).
  if (inputTokens > 0 || outputTokens > 0) {
    trackCost(tool || 'chat', body.model, {
      input_tokens: inputTokens, output_tokens: outputTokens,
      cache_creation_input_tokens: cacheCreateTokens,
      cache_read_input_tokens: cacheReadTokens,
    }, searchCount)
  }
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

  const model = getModel()
  const body = {
    model,
    max_tokens:       MAX_TOKENS,
    _tool:            null,
    _lang:            lang,
    _expert:          false,
    _systemStaticKey: null,
    messages:         apiMessages,
    stream:           true,
  }
  if (!model.startsWith('claude-opus-4-8')) {
    body.temperature = temperature
  }
  if (webSearch) {
    body.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }]
  }

  let fullText = ''
  let chatInputTokens = 0, chatOutputTokens = 0
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
          } else if (evt.type === 'message_start') {
            chatInputTokens = evt.message?.usage?.input_tokens || 0
          } else if (evt.type === 'message_delta') {
            chatOutputTokens = evt.usage?.output_tokens || chatOutputTokens
          }
        } catch { /* skip malformed SSE events */ }
      }
    }
    if (!fullText.trim()) throw new Error('stream-empty')
  } catch {
    // Repli non-streamé uniquement si rien n'a été reçu.
    if (!fullText.trim()) {
      const r = await postNonStream(body)
      fullText = r.text
      onChunk?.(fullText)
      if (r.usage?.input_tokens) {
        chatInputTokens  = r.usage.input_tokens  || 0
        chatOutputTokens = r.usage.output_tokens || 0
      }
    }
  }

  auditResponse(fullText, 'chat')
  if (chatInputTokens > 0 || chatOutputTokens > 0) {
    trackCost('chat', model, { input_tokens: chatInputTokens, output_tokens: chatOutputTokens }, 0)
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
