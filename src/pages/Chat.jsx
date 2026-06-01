import { Trash2, MessageSquare, Sparkles } from 'lucide-react'
import ChatWindow from '@/components/chat/ChatWindow'
import ChatInput from '@/components/chat/ChatInput'
import { useChat } from '@/hooks/useChat'
import { useSettings } from '@/contexts/SettingsContext'

export default function Chat() {
  const { t } = useSettings()
  const { messages, isLoading, error, send, clear } = useChat()
  const isEmpty = messages.length === 0

  const suggestions = [
    t('chat_s1'),
    t('chat_s2'),
    t('chat_s3'),
    t('chat_s4'),
  ]

  return (
    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0">
      {/* Toolbar — desktop only (header already names the page on mobile) */}
      <div className="hidden md:flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold"
                  style={{ background: 'linear-gradient(90deg, #50E5E5, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Autobuyunion
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow flex-shrink-0" />
              <span className="text-[10px] font-medium text-emerald-400/80">{t('connected_label')}</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition px-2.5 py-1.5 rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={13} />
            <span>{t('chat_clear')}</span>
          </button>
        )}
      </div>

      {/* Clear button mobile — icon-only, shown only when there are messages */}
      {messages.length > 0 && (
        <div className="md:hidden flex justify-end flex-shrink-0">
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition px-2.5 py-1.5 rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={13} />
            <span>{t('chat_clear')}</span>
          </button>
        </div>
      )}

      {/* Chat area */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Welcome state */}
        {isEmpty && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 gap-4 overflow-y-auto">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl scale-150" />
              <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <MessageSquare size={20} className="text-cyan-400 md:hidden" />
                <MessageSquare size={24} className="text-cyan-400 hidden md:block" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-white mb-1">{t('chat_assistant_name')}</h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                {t('chat_welcome_desc')}
              </p>
            </div>
            <div className="w-full max-w-md space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">
                {t('suggestions_label')}
              </p>
              {suggestions.map((q, i) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className={`w-full text-left text-xs text-slate-400 px-4 py-3 rounded-xl
                             border border-navy-700/40 bg-navy-900/20
                             active:bg-cyan-400/8 active:border-cyan-400/25
                             transition-colors duration-100 flex items-start gap-2.5
                             focus:outline-none`}
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
          <ChatWindow messages={messages} isLoading={isLoading} />
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
