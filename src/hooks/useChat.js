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

  // Lance la réponse assistant à partir d'un historique donné (qui se termine
  // déjà par le dernier message utilisateur). Partagé par send() et retry().
  const runAssistant = useCallback(async (history) => {
    setIsLoading(true)
    setError(null)

    const assistantId = newId()
    let firstChunk = true

    try {
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
  }, [lang])

  const send = useCallback(async (text, attachment = null) => {
    const userMsg = { id: newId(), role: 'user', content: text, attachment }
    const history = [...messages, userMsg] // snapshot avant la mise à jour d'état
    setMessages(prev => [...prev, userMsg])
    await runAssistant(history)
  }, [messages, runAssistant])

  // Relance la dernière requête : l'historique se termine déjà par le message
  // utilisateur en échec, on ne le ré-ajoute donc pas (pas de doublon).
  const retry = useCallback(async () => {
    if (isLoading || messages.length === 0) return
    await runAssistant(messages)
  }, [isLoading, messages, runAssistant])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, retry, clear }
}
