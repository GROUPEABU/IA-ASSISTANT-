import { useState } from 'react'
import { Send, Paperclip } from 'lucide-react'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez une question sur vos ventes..."
          rows={1}
          disabled={disabled}
          className="w-full bg-navy-800/80 border border-navy-700/50 rounded-xl px-4 py-3 pr-12
                     text-sm text-slate-200 placeholder-slate-600 resize-none
                     focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20
                     disabled:opacity-50 transition"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        <button
          type="button"
          className="absolute right-3 bottom-3 text-slate-600 hover:text-slate-400 transition"
        >
          <Paperclip size={16} />
        </button>
      </div>

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="w-12 h-12 rounded-xl bg-cyan-400 text-navy-900 flex items-center justify-center
                   hover:bg-cyan-300 active:scale-95 transition-all duration-150
                   disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
      >
        <Send size={17} />
      </button>
    </form>
  )
}
