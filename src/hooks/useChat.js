import { useState, useCallback } from 'react'
import { sendMessage } from '@/services/claude'
import { useSettings } from '@/contexts/SettingsContext'

let msgId = 0
const newId = () => `msg-${++msgId}`

export function useChat() {
  const { lang } = useSettings()
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const send = useCallback(async (text, attachment = null) => {
    const userMsg = { id: newId(), role: 'user', content: text, attachment }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    try {
      const history = [...messages, userMsg]
      const reply = await sendMessage(history, { lang })
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, clear }
}
