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

function buildSystemPrompt(lang = 'fr') {
  const langName = LANG_NAMES[lang] || 'French'
  return `You are an AI assistant expert in automotive sales for Autobuyunion, Europe's leading automotive purchasing group. You help sales teams with vehicle analysis, pricing, objections, and commercial strategy. Always respond in ${langName}. Be concise and direct: maximum 5-6 lines per response, use bullet points, no long paragraphs. Give precise figures and actionable advice.`
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
 * @returns {Promise<string>}  the assistant's text response
 * @throws  {Error} if no API key is configured, or if the API rejects the request
 */
export async function sendMessage(messages, { lang = 'fr' } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('Anthropic API key missing. Please add your key in Settings.')
  }

  const apiMessages = messages.map(({ role, content, attachment }) => ({
    role,
    content: buildContent(content, attachment),
  }))

  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: {
      'x-api-key':                                   apiKey,
      'anthropic-version':                           API_VERSION,
      'content-type':                                'application/json',
      'anthropic-dangerous-direct-browser-access':   'true',
    },
    body: JSON.stringify({
      model:      getModel(),
      max_tokens: MAX_TOKENS,
      system:     buildSystemPrompt(lang),
      messages:   apiMessages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur API Anthropic (${response.status})`)
  }

  const payload = await response.json()
  const text = payload.content?.[0]?.text
  if (typeof text !== 'string') {
    throw new Error('Unexpected API response (no text content).')
  }
  return text
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
export function extractJSON(raw, kind = 'object') {
  const pattern = kind === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = raw.match(pattern)
  if (!match) throw new Error('Invalid AI response: no JSON detected.')
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error('Invalid AI response: malformed JSON.')
  }
}
