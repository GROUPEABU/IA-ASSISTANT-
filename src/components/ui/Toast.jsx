import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, WifiOff } from 'lucide-react'

// Module-level singleton push — avoids Provider boilerplate
let _push = null

export function useToast() {
  return {
    toast: (message, type = 'error', duration = 4500) => _push?.(message, type, duration),
  }
}

const ICONS = {
  error:   <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />,
  success: <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />,
  offline: <WifiOff size={14} className="text-warn flex-shrink-0 mt-0.5" />,
}

const STYLES = {
  error:   'bg-navy-800 border-red-500/30 text-red-300',
  success: 'bg-navy-800 border-emerald-500/30 text-emerald-300',
  offline: 'bg-navy-800 border-warn/30 text-warn',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _push = (message, type = 'error', duration = 4500) => {
      const id = Date.now() + crypto.getRandomValues(new Uint32Array(1))[0]
      setToasts(prev => [...prev.slice(-4), { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return () => { _push = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg
                      text-xs font-medium max-w-xs pointer-events-auto animate-fade-in
                      ${STYLES[t.type] || STYLES.error}`}
        >
          {ICONS[t.type] || ICONS.error}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="opacity-50 hover:opacity-100 transition ml-1 flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
