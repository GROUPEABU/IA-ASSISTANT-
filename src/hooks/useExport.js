import { useState, useCallback } from 'react'

/**
 * Mutualise l'état d'export (PDF/CSV) des outils.
 *
 * Chaque page réimplémentait le même couple `useState(exporting)` + try/finally
 * autour de `exportToPdf`. Ce hook centralise ce motif : `withExporting` bascule
 * `exporting` à true le temps de la tâche async, et le rétablit quoi qu'il arrive.
 *
 * @returns {{ exporting: boolean, withExporting: (fn: () => Promise<any>) => Promise<any> }}
 */
export function useExport() {
  const [exporting, setExporting] = useState(false)

  const withExporting = useCallback(async (fn) => {
    setExporting(true)
    try { return await fn() } finally { setExporting(false) }
  }, [])

  return { exporting, withExporting }
}
