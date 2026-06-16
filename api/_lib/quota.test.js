import { describe, it, expect } from 'vitest'
import { computeCost, parseUsageFromText, quotaEnabled } from './quota.js'

describe('computeCost', () => {
  it('prices input tokens per model ($/M)', () => {
    expect(computeCost('claude-haiku-4-5-20251001', { input_tokens: 1_000_000 })).toBeCloseTo(1.0, 6)
    expect(computeCost('claude-sonnet-4-6', { input_tokens: 1_000_000 })).toBeCloseTo(3.0, 6)
  })

  it('sums input, output, cache and web-search costs', () => {
    const cost = computeCost('claude-sonnet-4-6', {
      input_tokens: 1_000_000,            // 3.00
      output_tokens: 1_000_000,           // 15.00
      cache_read_input_tokens: 1_000_000, // 0.30
    }, 2)                                  // + 0.02
    expect(cost).toBeCloseTo(18.32, 6)
  })

  it('falls back to Sonnet pricing for an unknown model', () => {
    expect(computeCost('mystery', { input_tokens: 1_000_000 })).toBeCloseTo(3.0, 6)
  })
})

describe('parseUsageFromText', () => {
  it('reads input/cache from message_start and the LAST output_tokens', () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"usage":{"input_tokens":1200,"cache_creation_input_tokens":300,"cache_read_input_tokens":50,"output_tokens":1}}}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","usage":{"output_tokens":850}}',
    ].join('\n')
    const { usage } = parseUsageFromText(sse)
    expect(usage.input_tokens).toBe(1200)
    expect(usage.cache_creation_input_tokens).toBe(300)
    expect(usage.cache_read_input_tokens).toBe(50)
    expect(usage.output_tokens).toBe(850) // cumulatif final, pas le 1 initial
  })

  it('counts web search result blocks', () => {
    const txt = '...{"type":"web_search_tool_result"}...{"type":"web_search_tool_result"}...'
    expect(parseUsageFromText(txt).searchCount).toBe(2)
  })

  it('parses a non-streamed JSON body too', () => {
    const jsonBody = '{"usage":{"input_tokens":500,"output_tokens":222}}'
    const { usage } = parseUsageFromText(jsonBody)
    expect(usage.input_tokens).toBe(500)
    expect(usage.output_tokens).toBe(222)
  })
})

describe('quotaEnabled', () => {
  it('is disabled when no KV env vars are set (graceful degradation)', () => {
    // En environnement de test aucune variable KV_*/UPSTASH_* n'est définie.
    expect(quotaEnabled()).toBe(false)
  })
})
