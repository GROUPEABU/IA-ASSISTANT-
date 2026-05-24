import clsx from 'clsx'
import { Bot, User, FileText, Image } from 'lucide-react'

export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant'
  const { attachment } = message

  return (
    <div className={clsx('flex gap-3 animate-slide-up', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold',
        isAssistant
          ? 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-400'
          : 'bg-navy-700 border border-navy-600 text-slate-300',
      )}>
        {isAssistant ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* Bubble */}
      <div className="max-w-[75%] flex flex-col gap-1.5">
        {attachment && (
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border',
            isAssistant
              ? 'bg-navy-800/80 border-navy-700/50 text-slate-400'
              : 'bg-cyan-400/10 border-cyan-400/20 text-cyan-300',
          )}>
            {attachment.type?.startsWith('image/')
              ? <Image size={11} />
              : <FileText size={11} />}
            <span className="truncate max-w-[140px]">{attachment.name}</span>
          </div>
        )}
        {message.content && (
          <div className={clsx(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isAssistant
              ? 'bg-navy-800/80 border border-navy-700/50 text-slate-200 rounded-tl-sm'
              : 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-100 rounded-tr-sm',
          )}>
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}
