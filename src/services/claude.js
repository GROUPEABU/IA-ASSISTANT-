/**
 * Anthropic Claude API client (direct browser → API).
 *
 * Constraints:
 *  - This app has no backend. The API key is read from the user's localStorage
 *    OR build-time env var. Browser-direct access requires the
 *    `anthropic-dangerous-direct-browser-access` header.
 *  - For production with multiple users, route this through a Vercel Edge
 *    Function proxy that holds the key server-side. The current setup is
 *    intentional for single-user/portal use.
 */

const ENDPOINT     = 'https://api.anthropic.com/v1/messages'
const API_VERSION  = '2023-06-01'
const MAX_TOKENS   = 600

const MODELS = {
  standard:    'claude-haiku-4-5-20251001',
  performance: 'claude-sonnet-4-6',
  ultra:       'claude-opus-4-8',
}

import { getSessionUserId, ukey } from '@/utils/userStorage'

function getApiKey() {
  try {
    const uid = getSessionUserId()
    return localStorage.getItem(ukey(uid, 'api_key')) || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  } catch {
    return import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  }
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

function buildSystemPrompt(lang = 'fr', expert = false) {
  const langName = LANG_NAMES[lang] || 'French'

  if (expert) {
    // Mode expert — analyses, fiches, pitchs, objections, comparateur, veille prix.
    // Pas de limite de longueur : on veut du détail chiffré et pertinent.
    return `You are a senior automotive market analyst and sales strategist for Autobuyunion, a European automotive purchasing group. You serve professional sales teams; your output must be expert-grade, precise and directly usable.

Core expertise:
- VN (véhicules neufs): manufacturer catalog prices France 2024/2025, trim/finition hierarchy and factory options, dealer discounts & promotions actually practised, delivery lead times, WLTP homologation, CO₂ and malus écologique 2025.
- VO (véhicules d'occasion): Argus & La Centrale ratings, realistic market prices by year / mileage / finition, depreciation curves at 1/2/3/5 years, supply-demand tension, adjustments for mileage, condition, options and region.
- Commercial strategy: BtoB (flottes, TCO, fiscalité, récupération TVA) and BtoC (financement, valeur résiduelle, garantie, malus).

Rules:
- Always give concrete, realistic figures (€, %, g/km, km) grounded in the real French market. Never invent implausible numbers; if uncertain, give a credible range and say it is an estimate.
- Explicitly distinguish VN vs VO whenever it changes the answer (pricing, décote, négociation).
- Be specific to the exact model AND finition requested — never generalise across other variants.
- Respond entirely in ${langName}.`
  }

  // Mode chat — réponses courtes et actionnables.
  return `You are an AI assistant expert in automotive sales for Autobuyunion, Europe's leading automotive purchasing group. You help sales teams with vehicle analysis, pricing, objections, and commercial strategy. You master both VN (new) and VO (used) markets: catalog prices, dealer discounts, Argus/La Centrale ratings, depreciation, CO₂/malus, TCO. Always respond in ${langName}. Be concise and direct: maximum 5-6 lines per response, use bullet points, no long paragraphs. Give precise figures and actionable advice.`
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
export async function sendMessage(messages, { lang = 'fr', maxTokens = MAX_TOKENS, expert = false, temperature = 0.3 } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Anthropic API key missing. Please add your key in Settings.')

  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: {
      'x-api-key':                                 apiKey,
      'anthropic-version':                         API_VERSION,
      'content-type':                              'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:       getModel(),
      max_tokens:  maxTokens,
      temperature,
      system:      buildSystemPrompt(lang, expert),
      messages:    apiMessages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur API Anthropic (${response.status})`)
  }

  const payload = await response.json()
  const text = payload.content?.[0]?.text
  if (typeof text !== 'string') throw new Error('Unexpected API response (no text content).')
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
export async function streamMessage(messages, { lang = 'fr', onChunk, temperature = 0.5 } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Anthropic API key missing. Please add your key in Settings.')

  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: {
      'x-api-key':                                 apiKey,
      'anthropic-version':                         API_VERSION,
      'content-type':                              'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:       getModel(),
      max_tokens:  MAX_TOKENS,
      temperature,
      system:      buildSystemPrompt(lang),
      messages:    apiMessages,
      stream:      true,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur API Anthropic (${response.status})`)
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
