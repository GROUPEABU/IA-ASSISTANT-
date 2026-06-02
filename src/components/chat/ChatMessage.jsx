import clsx from 'clsx'
import { User, FileText, Image } from 'lucide-react'
import DOMPurify from 'dompurify'

function AbuLogo() {
  return (
    <svg viewBox="0 0 100 100" width="18" height="18" fill="none">
      <path d="M 14 50 a 18 18 0 1 0 36 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 a 18 18 0 1 0 -36 0"
        stroke="#50E5E5" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// Convertit le Markdown basique de Claude en HTML sécurisé (DOMPurify).
// Couvre : titres, gras, italique, code, listes à puce, sauts de ligne.
function mdToHtml(text) {
  if (!text) return ''
  let s = text
    // Escaper d'abord pour éviter les injections HTML dans le texte brut
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Titres
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Gras + italique combinés
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Gras
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italique (éviter les listes `-`)
    .replace(/(?<![*])\*(?![*\s])(.+?)(?<!\s)\*(?![*])/g, '<em>$1</em>')
    // Code inline
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Listes à puce (- item ou * item)
    .replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>')
    // Regrouper les <li> consécutifs dans un <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (m) => `<ul>${m}</ul>`)
    // Paragraphes : double saut de ligne
    .replace(/\n{2,}/g, '</p><p>')
    // Saut de ligne simple (hors blocs)
    .replace(/\n/g, '<br>')
  s = '<p>' + s + '</p>'
  // Nettoyer les balises ouvertes/fermées parasites autour des blocs
  s = s.replace(/<p>(<h[123]>)/g, '$1').replace(/(<\/h[123]>)<\/p>/g, '$1')
  s = s.replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1')
  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: ['p','h1','h2','h3','strong','em','code','ul','li','br'],
    ALLOWED_ATTR: [],
  })
}

export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant'
  const { attachment } = message
  const html = isAssistant ? mdToHtml(message.content) : null

  return (
    <div className={clsx('flex gap-3 animate-slide-up', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold',
        isAssistant
          ? 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-400'
          : 'bg-navy-700 border border-navy-600 text-slate-300',
      )}>
        {isAssistant ? <AbuLogo /> : <User size={16} />}
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
        {(message.content || message.streaming) && (
          <div className={clsx(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isAssistant
              ? 'bg-navy-800/80 border border-navy-700/50 text-slate-200 rounded-tl-sm chat-md'
              : 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-100 rounded-tr-sm whitespace-pre-wrap',
          )}>
            {isAssistant
              ? <span dangerouslySetInnerHTML={{ __html: html }} />
              : message.content}
            {message.streaming && (
              <span className="inline-block w-0.5 h-[1em] bg-cyan-400 animate-pulse align-middle ml-0.5 opacity-80" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
