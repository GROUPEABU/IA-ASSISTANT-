import { useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import Spinner from '@/components/ui/Spinner'

const SUGGESTIONS = [
  { text: 'Comment répondre à un client qui trouve le prix trop élevé ?', tag: 'Objections' },
  { text: 'Quels arguments pour vendre un JAECOO J6 à une entreprise ?', tag: 'BtoB' },
  { text: 'Explique le malus 2025 pour un véhicule à 160 g/km de CO₂', tag: 'CO₂ & Malus' },
  { text: 'Comment interpréter le prix moyen marché de la Veille Prix ?', tag: 'Veille prix' },
  { text: 'Donne-moi un pitch de vente JAECOO J5 pour un particulier', tag: 'BtoC' },
  { text: 'Quelles sont les étapes pour générer une fiche produit IA ?', tag: 'Fiches produits' },
]

export default function ChatWindow({ messages, isLoading, onSend }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Bonjour, comment puis-je vous aider ?</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            Je suis votre assistant IA spécialisé dans l'analyse des données de ventes automobiles Autobuyunion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => onSend(s.text)}
              className="text-left bg-navy-800/60 border border-navy-700/50
                         rounded-xl px-3 py-2.5 hover:border-cyan-400/30 hover:bg-navy-800
                         transition-all duration-150 flex flex-col gap-1"
            >
              <span className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider">{s.tag}</span>
              <span className="text-xs text-slate-300 leading-snug">{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex gap-3 animate-slide-up">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                          bg-cyan-400/10 border border-cyan-400/30 text-cyan-400">
            <span className="text-base">🤖</span>
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
