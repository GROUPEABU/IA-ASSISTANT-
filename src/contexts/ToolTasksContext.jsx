import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Tâches & sessions d'outils — vivent AU-DESSUS du routeur, donc elles
 * survivent à la navigation interne (changement de page React Router).
 *
 * Deux préoccupations, deux contextes séparés pour éviter les rendus inutiles :
 *   • SessionCtx — l'état métier persistant d'un outil (véhicules, plan, messages…).
 *     Mis à jour très souvent (streaming token par token). Seules les pages
 *     d'outil le consomment.
 *   • TaskCtx — le statut d'avancement par outil (running / done / error).
 *     Mis à jour rarement (début/fin). Consommé par la Sidebar et le Header pour
 *     l'indicateur « analyse en cours », sans re-render à chaque token streamé.
 *
 * Comme un appel IA est lancé depuis un gestionnaire de la page mais écrit dans
 * CE provider (toujours monté), le résultat continue d'arriver et d'être
 * mémorisé même si l'utilisateur a quitté la page entre-temps. En revenant sur
 * l'outil, la page se ré-hydrate depuis la session.
 */
const SessionCtx = createContext(null)
const TaskCtx = createContext(null)

export function ToolTasksProvider({ children }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState({})
  const [tasks, setTasks] = useState({})

  // Cloisonnement par utilisateur : si le compte change (déconnexion / autre
  // login sur le même onglet), on purge tout pour ne jamais fuiter de données.
  const uidRef = useRef(user?.id ?? null)
  useEffect(() => {
    const uid = user?.id ?? null
    if (uidRef.current !== uid) {
      uidRef.current = uid
      setSessions({})
      setTasks({})
    }
  }, [user?.id])

  const setSession = useCallback((tool, val) => {
    setSessions((prev) => {
      const current = prev[tool]
      const next = typeof val === 'function' ? val(current) : val
      if (next === current) return prev
      return { ...prev, [tool]: next }
    })
  }, [])

  const clearSession = useCallback((tool) => {
    setSessions((prev) => {
      if (!(tool in prev)) return prev
      const n = { ...prev }
      delete n[tool]
      return n
    })
  }, [])

  const startTask = useCallback((tool, label) => {
    setTasks((prev) => ({ ...prev, [tool]: { label, status: 'running', startedAt: Date.now() } }))
  }, [])

  const finishTask = useCallback((tool, status = 'done') => {
    setTasks((prev) => (prev[tool] ? { ...prev, [tool]: { ...prev[tool], status, endedAt: Date.now() } } : prev))
  }, [])

  const clearTask = useCallback((tool) => {
    setTasks((prev) => {
      if (!(tool in prev)) return prev
      const n = { ...prev }
      delete n[tool]
      return n
    })
  }, [])

  const sessionValue = useMemo(
    () => ({ sessions, setSession, clearSession }),
    [sessions, setSession, clearSession],
  )
  const taskValue = useMemo(
    () => ({ tasks, startTask, finishTask, clearTask }),
    [tasks, startTask, finishTask, clearTask],
  )

  return (
    <TaskCtx.Provider value={taskValue}>
      <SessionCtx.Provider value={sessionValue}>{children}</SessionCtx.Provider>
    </TaskCtx.Provider>
  )
}

/**
 * Session persistante d'un outil. Retourne [session, setSession, clearSession].
 * `setSession` accepte une valeur ou une fonction (prev) => next (recommandé
 * dans les callbacks asynchrones pour rester à jour après navigation).
 */
export function useToolSession(tool) {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useToolSession must be used within ToolTasksProvider')
  const { sessions, setSession, clearSession } = ctx
  const set = useCallback((val) => setSession(tool, val), [setSession, tool])
  const clear = useCallback(() => clearSession(tool), [clearSession, tool])
  return [sessions[tool], set, clear]
}

/** Statut des tâches de fond (pour l'indicateur de navigation). */
export function useToolTasks() {
  const ctx = useContext(TaskCtx)
  if (!ctx) throw new Error('useToolTasks must be used within ToolTasksProvider')
  return ctx
}

/**
 * Combine session + statut pour un outil dont la tâche IA doit continuer en
 * fond. Standardise le pattern utilisé par les pages :
 *   const { s, patch, reset, running, start, finish } = useToolBackground(TOOL, EMPTY)
 *
 * • `s`        — session courante (jamais undefined, repli sur `empty`)
 * • `patch`    — fusion partielle dans la session (valeur ou (prev)=>partial)
 * • `reset`    — réinitialise la session à `empty`
 * • `running`  — true tant que la tâche est en cours
 * • `start/finish` — marque le statut (pour l'indicateur Sidebar/Header)
 *
 * `empty` DOIT être une constante stable (définie au niveau module).
 */
export function useToolBackground(tool, empty) {
  const [session, setSession] = useToolSession(tool)
  const { tasks, startTask, finishTask, clearTask } = useToolTasks()
  const s = session ?? empty
  const running = tasks[tool]?.status === 'running'

  // Tant que la page est ouverte, l'indicateur du menu n'a pas lieu d'être :
  // une tâche terminée/en erreur est effacée. Si on était ailleurs à la fin,
  // l'indicateur a persisté pour prévenir, puis se nettoie au retour.
  useEffect(() => {
    const status = tasks[tool]?.status
    if (status === 'done' || status === 'error') clearTask(tool)
  }, [tasks, clearTask, tool])

  const patch = useCallback((upd) => {
    setSession((prev) => {
      const base = prev ?? empty
      return { ...base, ...(typeof upd === 'function' ? upd(base) : upd) }
    })
  }, [setSession, empty])

  const reset = useCallback(() => setSession(empty), [setSession, empty])
  const start = useCallback((label) => startTask(tool, label), [startTask, tool])
  const finish = useCallback((status = 'done') => finishTask(tool, status), [finishTask, tool])

  return { s, patch, setSession, reset, running, start, finish }
}
