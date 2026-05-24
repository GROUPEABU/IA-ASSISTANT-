import { useState, useCallback } from 'react'

/**
 * Simple arithmetic CAPTCHA.
 * Generates a single-digit addition challenge and exposes a stable verify function.
 * The `generate` function is stable (useCallback with no deps) so it is safe
 * to include in useEffect dependency arrays.
 */
export function useCaptcha() {
  const [challenge, setChallenge] = useState(null)
  const [answer, setAnswer]       = useState('')

  const generate = useCallback(() => {
    const a = Math.ceil(Math.random() * 9)
    const b = Math.ceil(Math.random() * 9)
    setChallenge({ a, b, expected: a + b })
    setAnswer('')
  }, [])

  const verify = useCallback(
    () => !challenge || parseInt(answer, 10) === challenge.expected,
    [challenge, answer],
  )

  return { challenge, answer, setAnswer, generate, verify }
}
