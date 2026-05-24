import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateOTP,
  storeResetToken,
  readResetToken,
  consumeResetToken,
  RESET_TTL_MS,
} from './passwordReset'

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('generateOTP', () => {
  it('generates a 6-digit string', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOTP()
      expect(otp).toMatch(/^\d{6}$/)
    }
  })
})

describe('storeResetToken + readResetToken', () => {
  it('round-trips a code with the correct expiry window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))

    storeResetToken('admin', '123456')
    const token = readResetToken('admin')

    expect(token.code).toBe('123456')
    expect(token.exp).toBe(Date.now() + RESET_TTL_MS)
  })

  it('normalises username to lowercase for both read and write', () => {
    storeResetToken('ADMIN', '999999')
    expect(readResetToken('admin')?.code).toBe('999999')
    expect(readResetToken('Admin')?.code).toBe('999999')
  })

  it('returns null when no token exists', () => {
    expect(readResetToken('nobody')).toBeNull()
  })

  it('returns null on corrupted storage', () => {
    localStorage.setItem('abu_reset_admin', '{not json')
    expect(readResetToken('admin')).toBeNull()
  })
})

describe('consumeResetToken', () => {
  it('removes the token after consumption', () => {
    storeResetToken('admin', '123456')
    expect(readResetToken('admin')).not.toBeNull()
    consumeResetToken('admin')
    expect(readResetToken('admin')).toBeNull()
  })
})
