import { useState, useCallback } from 'react'
import { streamMessage } from '@/services/claude'
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
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    const assistantId = newId()
    let firstChunk = true

    try {
      // Snapshot history before state update
      const history = [...messages, userMsg]

      await streamMessage(history, {
        lang,
        webSearch: true,
        onChunk: (fullText) => {
          if (firstChunk) {
            firstChunk = false
            setIsLoading(false)
            setMessages(prev => [
              ...prev,
              { id: assistantId, role: 'assistant', content: fullText, streaming: true },
            ])
          } else {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: fullText } : m
            ))
          }
        },
      })

      // Finalize: remove streaming cursor
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ))
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== assistantId))
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [messages, lang])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, clear }
}
