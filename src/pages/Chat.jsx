import { Trash2 } from 'lucide-react'
import ChatWindow from '@/components/chat/ChatWindow'
import ChatInput from '@/components/chat/ChatInput'
import { useChat } from '@/hooks/useChat'

export default function Chat() {
  const { messages, isLoading, error, send, clear } = useChat()

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in" style={{ maxHeight: 'calc(100vh - 112px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-slow" />
          <span className="text-xs text-slate-500">Assistant connecté · Claude Sonnet 4</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition"
          >
            <Trash2 size={13} />
            Effacer
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        <ChatWindow messages={messages} isLoading={isLoading} onSend={send} />

        {error && (
          <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="p-4 border-t border-navy-700/50 flex-shrink-0">
          <ChatInput onSend={send} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
