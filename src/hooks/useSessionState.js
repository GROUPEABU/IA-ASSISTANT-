import { useState, useEffect } from 'react'

/**
 * Like useState but backed by sessionStorage.
 * State is restored on mount and saved on every change.
 * Scoped to the browser tab — cleared when the tab closes.
 *
 * @param {string}  key           sessionStorage key
 * @param {*}       defaultValue  value used when nothing is saved yet
 */
export function useSessionState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(state)) } catch {}
  }, [key, state])

  return [state, setState]
}
