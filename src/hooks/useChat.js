import { useState, useCallback, useEffect } from 'react'
import { streamMessage } from '@/services/claude'
import { useSettings } from '@/contexts/SettingsContext'
import { useToolSession, useToolTasks } from '@/contexts/ToolTasksContext'

const TOOL = 'chat'
const EMPTY = { messages: [] }

let msgId = 0
const newId = () => `msg-${++msgId}`

/**
 * Conversation de l'assistant. Les messages vivent dans la session d'outil
 * (au-dessus du routeur) : la réponse continue d'arriver en fond si on quitte
 * la page, et la conversation est restaurée en revenant. Le statut de tâche
 * alimente l'indicateur « en cours » de la navigation.
 *
 * `isLoading` reste LOCAL : il ne couvre que l'attente du PREMIER token (bulle
 * « en train d'écrire »). Pendant le streaming, c'est le message lui-même qui
 * s'affiche. `isBusy` (tâche en cours) sert à bloquer la saisie tant qu'une
 * réponse est en cours, y compris après un retour de navigation.
 */
export function useChat() {
  const { lang } = useSettings()
  const [session, setSession] = useToolSession(TOOL)
  const messages = (session ?? EMPTY).messages
  const { tasks, startTask, finishTask, clearTask } = useToolTasks()
  const isBusy = tasks[TOOL]?.status === 'running'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // En revenant sur le chat, on efface l'indicateur « prêt »/« erreur » du menu.
  useEffect(() => {
    const status = tasks[TOOL]?.status
    if (status === 'done' || status === 'error') clearTask(TOOL)
  }, [tasks, clearTask])

  const setMessages = useCallback((updater) => {
    setSession((prev) => {
      const base = prev ?? EMPTY
      const next = typeof updater === 'function' ? updater(base.messages) : updater
      return { ...base, messages: next }
    })
  }, [setSession])

  // Lance la réponse assistant à partir d'un historique donné (qui se termine
  // déjà par le dernier message utilisateur). Partagé par send() et retry().
  const runAssistant = useCallback(async (history) => {
    setIsLoading(true)
    setError(null)
    startTask(TOOL)

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
            setMessages((prev) => [
              ...prev,
              { id: assistantId, role: 'assistant', content: fullText, streaming: true },
            ])
          } else {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            ))
          }
        },
      })

      // Finalize: remove streaming cursor
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ))
      finishTask(TOOL, 'done')
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      setError(err.message)
      finishTask(TOOL, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [lang, setMessages, startTask, finishTask])

  const send = useCallback(async (text, attachment = null) => {
    if (isBusy) return
    const userMsg = { id: newId(), role: 'user', content: text, attachment }
    const history = [...messages, userMsg] // snapshot avant la mise à jour d'état
    setMessages((prev) => [...prev, userMsg])
    await runAssistant(history)
  }, [isBusy, messages, runAssistant, setMessages])

  // Relance la dernière requête : l'historique se termine déjà par le message
  // utilisateur en échec, on ne le ré-ajoute donc pas (pas de doublon).
  const retry = useCallback(async () => {
    if (isBusy || messages.length === 0) return
    await runAssistant(messages)
  }, [isBusy, messages, runAssistant])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
    clearTask(TOOL)
  }, [setMessages, clearTask])

  return { messages, isLoading, isBusy, error, send, retry, clear }
}
