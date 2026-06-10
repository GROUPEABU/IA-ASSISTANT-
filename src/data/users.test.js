import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { USERS, findUserByUsername, validateCredentials, hashPassword } from './users'

// Le registre réel ne contient que des hashes (aucun mot de passe en clair) :
// le chemin « succès » est couvert via un utilisateur de test injecté, dont on
// contrôle le mot de passe, puis retiré du registre après la suite.
const TEST_PASSWORD = 'test-password-e2e'
const TEST_USER = { id: 999, username: 'test@unit.local', name: 'Test', role: 'membre', initials: 'TU' }

beforeAll(async () => {
  USERS.push({ ...TEST_USER, passwordHash: await hashPassword(TEST_PASSWORD) })
})

afterAll(() => {
  const i = USERS.findIndex(u => u.id === TEST_USER.id)
  if (i >= 0) USERS.splice(i, 1)
})

describe('findUserByUsername', () => {
  it('returns null for an unknown username', () => {
    expect(findUserByUsername('does-not-exist')).toBeNull()
  })

  it('matches a known username case-insensitively', () => {
    const known = USERS[0].username
    expect(findUserByUsername(known.toUpperCase())?.username).toBe(known)
  })

  it('returns the full user record (incl. password hash) for internal use', () => {
    const user = findUserByUsername(USERS[0].username)
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
    expect(await validateCredentials(TEST_USER.username, 'wrong')).toBeNull()
  })

  it('returns user without password hash on success', async () => {
    const safe = await validateCredentials(TEST_USER.username, TEST_PASSWORD)
    expect(safe).not.toBeNull()
    expect(safe.username).toBe(TEST_USER.username)
    expect(safe.passwordHash).toBeUndefined()
    expect(safe.password).toBeUndefined()
  })

  it('matches username case-insensitively', async () => {
    const safe = await validateCredentials(TEST_USER.username.toUpperCase(), TEST_PASSWORD)
    expect(safe?.username).toBe(TEST_USER.username)
  })

  it('every user in USERS has a unique username', () => {
    const usernames = USERS.map(u => u.username.toLowerCase())
    expect(new Set(usernames).size).toBe(USERS.length)
  })

  it('no user record stores a clear-text password', () => {
    for (const u of USERS) {
      expect(u.password).toBeUndefined()
      expect(u.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})
