import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { computeSecurityStatus, recordFailureState } from '@/utils/loginSecurity'

// ── Authentification serveur ──────────────────────────────────────────────────
// La vérification du mot de passe se fait dans la fonction Edge /api/login :
// aucun hash de mot de passe n'est présent dans le bundle, et la session est
// un jeton signé HMAC que /api/chat exige sur chaque appel IA. Forger une
// entrée localStorage ne donne donc plus aucun accès.

const SESSION_KEY  = 'abu_session'
const SECURITY_KEY = 'abu_login_security'

// Le throttle UX (fenêtre, seuils, durées de blocage) vit dans
// src/utils/loginSecurity.js — logique pure et testable.

function readSecurity() {
  try { return JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') } catch { return {} }
}

// Décode l'expiration du jeton (payload base64url avant le point) sans le
// vérifier — la vérification cryptographique reste côté serveur.
function tokenExpired(token) {
  try {
    const body = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(body + '='.repeat((4 - (body.length % 4)) % 4))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return !payload.exp || Date.now() > payload.exp
  } catch { return true }
}

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (!saved) return null
      const parsed = JSON.parse(saved)
      // Session sans jeton (ancien format) ou jeton expiré → reconnexion.
      if (!parsed?.token || tokenExpired(parsed.token)) {
        localStorage.removeItem(SESSION_KEY)
        return null
      }
      return parsed
    } catch { return null }
  })

  // Déconnexion forcée quand le proxy répond 401 (jeton expiré en cours de
  // session) — l'événement est émis par src/services/claude.js.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem(SESSION_KEY)
      setUser(null)
    }
    window.addEventListener('abu:unauthorized', onUnauthorized)
    return () => window.removeEventListener('abu:unauthorized', onUnauthorized)
  }, [])

  // ── Security status (called on every Login render) ───────────────────────
  const getSecurityStatus = useCallback(() => computeSecurityStatus(readSecurity()), [])

  const recordFailure = useCallback(() => {
    localStorage.setItem(SECURITY_KEY, JSON.stringify(recordFailureState(readSecurity())))
  }, [])

  const clearSecurity = useCallback(() => {
    localStorage.removeItem(SECURITY_KEY)
  }, [])

  // ── Auth actions ─────────────────────────────────────────────────────────
  /**
   * @returns {Promise<boolean>} false = identifiants refusés.
   * @throws {Error} erreur réseau/serveur (à afficher telle quelle).
   */
  const login = useCallback(async (username, password) => {
    let res
    try {
      res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
    } catch {
      throw new Error('Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.')
    }

    if (res.status === 401) return false
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Erreur du serveur (${res.status}). Réessayez.`)
    }

    const { user: safeUser, token } = await res.json()
    const session = { ...safeUser, token }
    setUser(session)
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    clearSecurity()
    return true
  }, [clearSecurity])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
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
