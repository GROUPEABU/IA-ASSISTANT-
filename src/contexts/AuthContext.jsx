import { createContext, useContext, useState, useCallback } from 'react'

const USERS = [
  { id: 1, username: 'admin', password: 'autobuyunion2025', name: 'Administrateur', role: 'admin', initials: 'AD' },
  { id: 2, username: 'membre', password: 'membre123', name: 'Membre', role: 'membre', initials: 'MB' },
  { id: 3, username: 'demo@autobuyunion.eu', password: 'Demo2025!', name: 'Compte Démo', role: 'membre', initials: 'DM' },
]

const SESSION_KEY    = 'abu_session'
const SECURITY_KEY   = 'abu_login_security'
const PW_OVERRIDE    = 'abu_pw_overrides'

const MAX_ATTEMPTS   = 5
const WINDOW_MS      = 15 * 60 * 1000   // 15 min window
const LOCKOUT_MS     = 15 * 60 * 1000   // 15 min lockout
const LOCKOUT_LONG   = 60 * 60 * 1000   // 1h after 10 fails

function readSecurity() {
  try { return JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') } catch { return {} }
}
function saveSecurity(data) {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(data))
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const getSecurityStatus = useCallback(() => {
    const sec = readSecurity()
    const now  = Date.now()
    // Purge attempts outside the rolling window
    const recent = (sec.attempts || []).filter(t => now - t < WINDOW_MS)
    const failCount = recent.length
    const blockedUntil = sec.blocked_until || 0
    const isBlocked = now < blockedUntil
    const remainingMs = isBlocked ? blockedUntil - now : 0
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failCount)
    return { isBlocked, remainingMs, failCount, attemptsLeft, recent }
  }, [])

  const recordFailure = useCallback(() => {
    const sec = readSecurity()
    const now = Date.now()
    const recent = [...(sec.attempts || []).filter(t => now - t < WINDOW_MS), now]
    let blocked_until = sec.blocked_until || 0
    if (recent.length >= 10) blocked_until = now + LOCKOUT_LONG
    else if (recent.length >= MAX_ATTEMPTS) blocked_until = now + LOCKOUT_MS
    saveSecurity({ attempts: recent, blocked_until })
  }, [])

  const clearSecurity = useCallback(() => {
    localStorage.removeItem(SECURITY_KEY)
  }, [])

  const login = useCallback((username, password) => {
    // Check password override first (from password reset)
    const overrides = (() => { try { return JSON.parse(localStorage.getItem(PW_OVERRIDE) || '{}') } catch { return {} } })()
    const override = overrides[username.toLowerCase()]

    let found = null
    if (override && override === password) {
      found = USERS.find(u => u.username.toLowerCase() === username.toLowerCase())
    } else {
      found = USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password)
    }

    if (!found) return false
    const { password: _, ...safe } = found
    setUser(safe)
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    clearSecurity()
    return true
  }, [clearSecurity])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const resetPassword = useCallback((username, newPassword) => {
    const overrides = (() => { try { return JSON.parse(localStorage.getItem(PW_OVERRIDE) || '{}') } catch { return {} } })()
    overrides[username.toLowerCase()] = newPassword
    localStorage.setItem(PW_OVERRIDE, JSON.stringify(overrides))
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, getSecurityStatus, recordFailure, clearSecurity, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
