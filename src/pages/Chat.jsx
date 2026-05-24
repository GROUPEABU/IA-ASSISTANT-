import { Trash2, MessageSquare, Sparkles } from 'lucide-react'
import ChatWindow from '@/components/chat/ChatWindow'
import ChatInput from '@/components/chat/ChatInput'
import { useChat } from '@/hooks/useChat'

const SUGGESTED = [
  'Quel est le malus CO₂ pour un SUV 150 g/km en France ?',
  'Compare les coûts TCO Peugeot 308 vs Volkswagen Golf',
  'Arguments de vente pour convaincre un client flottes BtoB',
  'Tendance prix marché Renault Clio 2022 occasion',
]

export default function Chat() {
  const { messages, isLoading, error, send, clear } = useChat()
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-slow flex-shrink-0" />
          <span className="text-xs text-slate-500">Assistant IA · Opérationnel</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition px-2.5 py-1.5 rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Effacer</span>
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Welcome state */}
        {isEmpty && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl scale-150" />
              <div className="relative w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <MessageSquare size={24} className="text-cyan-400" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-white mb-1">Assistant Autobuyunion</h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Posez vos questions sur les produits, le marché automobile ou les stratégies commerciales.
              </p>
            </div>
            <div className="w-full max-w-md space-y-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center mb-3">Suggestions</p>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs text-slate-400 px-4 py-3 rounded-xl
                             border border-navy-700/40 bg-navy-900/20
                             active:bg-cyan-400/8 active:border-cyan-400/25
                             transition-colors duration-100 flex items-start gap-2.5
                             focus:outline-none"
                >
                  <Sparkles size={12} className="text-cyan-400/60 flex-shrink-0 mt-0.5" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <ChatWindow messages={messages} isLoading={isLoading} onSend={send} />
        )}

        {error && (
          <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="p-3 md:p-4 border-t border-navy-700/50 flex-shrink-0">
          <ChatInput onSend={send} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
