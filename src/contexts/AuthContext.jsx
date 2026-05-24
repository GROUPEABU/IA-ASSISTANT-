import { createContext, useContext, useState, useEffect } from 'react'

const USERS = [
  { id: 1, username: 'admin', password: 'autobuyunion2025', name: 'Administrateur', role: 'admin', initials: 'AD' },
  { id: 2, username: 'membre', password: 'membre123', name: 'Membre', role: 'membre', initials: 'MB' },
]

const SESSION_KEY = 'abu_session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = (username, password) => {
    const found = USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    )
    if (!found) return false
    const { password: _, ...safe } = found
    setUser(safe)
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
