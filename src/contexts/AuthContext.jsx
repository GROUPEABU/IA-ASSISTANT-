import { createContext, useContext, useState, useCallback } from 'react'
import { findUserByUsername, validateCredentials, isExpired, hashPassword } from '@/data/users'

// ── localStorage keys ────────────────────────────────────────────────────────
const SESSION_KEY    = 'abu_session'
const SECURITY_KEY   = 'abu_login_security'
const PW_OVERRIDE_KEY = 'abu_pw_overrides'

// ── Brute-force constants ────────────────────────────────────────────────────
const MAX_ATTEMPTS  = 5
const WINDOW_MS     = 15 * 60 * 1000   // rolling window for counting failures
const LOCKOUT_SHORT = 15 * 60 * 1000   // ≥5 failures  → 15 min lockout
const LOCKOUT_LONG  = 60 * 60 * 1000   // ≥10 failures → 1 h  lockout

// ── Pure helpers (no side effects) ─────────────────────────────────────────
function readSecurity() {
  try { return JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') } catch { return {} }
}

function readPasswordOverrides() {
  try { return JSON.parse(localStorage.getItem(PW_OVERRIDE_KEY) || '{}') } catch { return {} }
}

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (!saved) return null
      const parsed = JSON.parse(saved)
      // Kick expired demo sessions on restore
      const full = findUserByUsername(parsed.username)
      if (isExpired(full)) {
        localStorage.removeItem(SESSION_KEY)
        return null
      }
      return parsed
    } catch { return null }
  })

  // ── Security status (called on every Login render) ───────────────────────
  const getSecurityStatus = useCallback(() => {
    const { attempts = [], blocked_until = 0 } = readSecurity()
    const now    = Date.now()
    const recent = attempts.filter(t => now - t < WINDOW_MS)
    const isBlocked    = now < blocked_until
    const remainingMs  = isBlocked ? blocked_until - now : 0
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - recent.length)
    return { isBlocked, remainingMs, failCount: recent.length, attemptsLeft }
  }, [])

  const recordFailure = useCallback(() => {
    const { attempts = [] } = readSecurity()
    const now    = Date.now()
    const recent = [...attempts.filter(t => now - t < WINDOW_MS), now]
    const blocked_until =
      recent.length >= 10 ? now + LOCKOUT_LONG  :
      recent.length >= MAX_ATTEMPTS ? now + LOCKOUT_SHORT : 0
    localStorage.setItem(SECURITY_KEY, JSON.stringify({ attempts: recent, blocked_until }))
  }, [])

  const clearSecurity = useCallback(() => {
    localStorage.removeItem(SECURITY_KEY)
  }, [])

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    // Check for a password override (set via the reset-password flow). Overrides
    // are stored as salted hashes, so we compare against the hash of the input.
    const overrides   = readPasswordOverrides()
    const override    = overrides[username.toLowerCase()]
    const inputHash   = await hashPassword(password)

    const safeUser = override && override === inputHash
      ? (() => {
          const user = findUserByUsername(username)
          if (!user || isExpired(user)) return null
          const { passwordHash: _, expiresAt: __, ...safe } = user
          return safe
        })()
      : await validateCredentials(username, password)

    if (!safeUser) return false

    setUser(safeUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser))
    clearSecurity()
    return true
  }, [clearSecurity])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  /** Stores a new password override (hashed) that takes precedence over the built-in one. */
  const resetPassword = useCallback(async (username, newPassword) => {
    const overrides = readPasswordOverrides()
    overrides[username.toLowerCase()] = await hashPassword(newPassword)
    localStorage.setItem(PW_OVERRIDE_KEY, JSON.stringify(overrides))
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      resetPassword,
      getSecurityStatus,
      recordFailure,
      clearSecurity,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
