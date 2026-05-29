import { useState, useCallback, useMemo } from 'react'
import { ukey, getSessionUserId } from '@/utils/userStorage'

const MAX = 10

export function useHistory(namespace) {
  const storageKey = useMemo(() => ukey(getSessionUserId(), `history_${namespace}`), [namespace])

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })

  const add = useCallback((item) => {
    setHistory(prev => {
      const next = [{ ...item, savedAt: Date.now() }, ...prev].slice(0, MAX)
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }, [storageKey])

  const clear = useCallback(() => {
    setHistory([])
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey])

  return { history, add, clear }
}
