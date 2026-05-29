import { useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import Spinner from '@/components/ui/Spinner'

/**
 * Active chat message list with assistant typing indicator.
 *
 * The empty-state UI lives in the parent `Chat.jsx` page so the
 * welcome can use page-level keys directly. This component only handles
 * the non-empty case.
 */
export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex gap-3 animate-slide-up">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                          bg-cyan-400/10 border border-cyan-400/30">
            <svg viewBox="0 0 100 100" width="18" height="18" fill="none">
              <path d="M 14 50 a 18 18 0 1 0 36 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 a 18 18 0 1 0 -36 0"
                stroke="#50E5E5" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div className="bg-navy-800/80 border border-navy-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
            <Spinner size="sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
