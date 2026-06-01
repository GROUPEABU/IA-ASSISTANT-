import { describe, it, expect } from 'vitest'
import { USERS, findUserByUsername, validateCredentials } from './users'

describe('findUserByUsername', () => {
  it('returns null for an unknown username', () => {
    expect(findUserByUsername('does-not-exist')).toBeNull()
  })

  it('matches a known username case-insensitively', () => {
    expect(findUserByUsername('ADMIN')?.username).toBe('admin')
    expect(findUserByUsername('Admin')?.username).toBe('admin')
  })

  it('returns the full user record (incl. password hash) for internal use', () => {
    const user = findUserByUsername('admin')
    expect(user).toMatchObject({ username: 'admin', role: 'admin' })
    expect(user.passwordHash).toBeTruthy()
    // No clear-text password must ever be present.
    expect(user.password).toBeUndefined()
  })
})

describe('validateCredentials', () => {
  it('returns null for unknown user', async () => {
    expect(await validateCredentials('nope', 'whatever')).toBeNull()
  })

  it('returns null for wrong password', async () => {
    expect(await validateCredentials('admin', 'wrong')).toBeNull()
  })

  it('returns user without password hash on success', async () => {
    const safe = await validateCredentials('admin', 'autobuyunion2025')
    expect(safe).not.toBeNull()
    expect(safe.username).toBe('admin')
    expect(safe.passwordHash).toBeUndefined()
    expect(safe.password).toBeUndefined()
  })

  it('matches username case-insensitively', async () => {
    const safe = await validateCredentials('ADMIN', 'autobuyunion2025')
    expect(safe?.username).toBe('admin')
  })

  it('every user in USERS has a unique username', () => {
    const usernames = USERS.map(u => u.username.toLowerCase())
    expect(new Set(usernames).size).toBe(USERS.length)
  })
})
