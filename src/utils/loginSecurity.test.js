import { describe, it, expect } from 'vitest'
import {
  computeSecurityStatus, recordFailureState,
  MAX_ATTEMPTS, WINDOW_MS, LOCKOUT_SHORT, LOCKOUT_LONG,
} from './loginSecurity'

const NOW = 1_000_000_000

describe('computeSecurityStatus', () => {
  it('fresh state: not blocked, full attempts left', () => {
    expect(computeSecurityStatus({}, NOW)).toEqual({
      isBlocked: false, remainingMs: 0, failCount: 0, attemptsLeft: MAX_ATTEMPTS,
    })
  })

  it('counts only failures within the rolling window', () => {
    const attempts = [NOW - WINDOW_MS - 1, NOW - 1000, NOW - 2000] // first is stale
    expect(computeSecurityStatus({ attempts }, NOW).failCount).toBe(2)
  })

  it('reports remaining lockout time when blocked', () => {
    const s = computeSecurityStatus({ blocked_until: NOW + 5000 }, NOW)
    expect(s.isBlocked).toBe(true)
    expect(s.remainingMs).toBe(5000)
  })

  it('never returns a negative attemptsLeft', () => {
    const attempts = Array(8).fill(NOW - 1000)
    expect(computeSecurityStatus({ attempts }, NOW).attemptsLeft).toBe(0)
  })

  it('tolerates a null/undefined security object', () => {
    expect(computeSecurityStatus(null, NOW).isBlocked).toBe(false)
  })
})

describe('recordFailureState', () => {
  it('appends the new failure timestamp without locking early', () => {
    const r = recordFailureState({ attempts: [NOW - 1000] }, NOW)
    expect(r.attempts).toEqual([NOW - 1000, NOW])
    expect(r.blocked_until).toBe(0)
  })

  it('triggers a short lockout on the 5th failure', () => {
    const attempts = Array(MAX_ATTEMPTS - 1).fill(NOW - 1000)
    const r = recordFailureState({ attempts }, NOW)
    expect(r.attempts).toHaveLength(MAX_ATTEMPTS)
    expect(r.blocked_until).toBe(NOW + LOCKOUT_SHORT)
  })

  it('escalates to a long lockout on the 10th failure', () => {
    const attempts = Array(9).fill(NOW - 1000)
    const r = recordFailureState({ attempts }, NOW)
    expect(r.attempts).toHaveLength(10)
    expect(r.blocked_until).toBe(NOW + LOCKOUT_LONG)
  })

  it('drops stale attempts outside the window before counting', () => {
    const attempts = [NOW - WINDOW_MS - 1, NOW - 1000]
    const r = recordFailureState({ attempts }, NOW)
    expect(r.attempts).toEqual([NOW - 1000, NOW])
  })
})
