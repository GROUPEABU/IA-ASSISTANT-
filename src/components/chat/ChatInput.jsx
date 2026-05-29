import { useState, useRef } from 'react'
import { Send, Paperclip, X, FileText, Image } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

const ACCEPTED = '.pdf,image/png,image/jpeg,image/gif,image/webp'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ChatInput({ onSend, disabled }) {
  const { t } = useSettings()
  const [value, setValue] = useState('')
  const [attachment, setAttachment] = useState(null)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    setAttachment({ name: file.name, type: file.type, base64 })
    e.target.value = ''
  }

  const textareaRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if ((!value.trim() && !attachment) || disabled) return
    onSend(value.trim(), attachment || null)
    setValue('')
    setAttachment(null)
    if (textareaRef.current) textareaRef.current.style.height = '48px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const autoResize = (e) => {
    const el = e.target
    el.style.height = '48px'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const isImage = attachment?.type?.startsWith('image/')

  return (
    <div className="space-y-2">
      {attachment && (
        <div className="flex items-center gap-2 px-3 py-2 bg-navy-900/60 border border-cyan-400/20 rounded-xl text-xs">
          {isImage
            ? <Image size={13} className="text-cyan-400 flex-shrink-0" />
            : <FileText size={13} className="text-cyan-400 flex-shrink-0" />}
          <span className="text-slate-300 truncate flex-1">{attachment.name}</span>
          <button onClick={() => setAttachment(null)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); autoResize(e) }}
            onKeyDown={handleKeyDown}
            placeholder={t('chat_placeholder')}
            rows={1}
            disabled={disabled}
            className="w-full bg-navy-800/80 border border-navy-700/50 rounded-xl px-4 pr-12
                       text-sm text-slate-200 placeholder-slate-600 resize-none
                       focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20
                       disabled:opacity-50 transition-all"
            style={{ height: '48px', maxHeight: '160px', paddingTop: '14px', paddingBottom: '14px', lineHeight: '1.5', overflowY: 'auto' }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute right-3 bottom-3 text-slate-600 hover:text-cyan-400 transition"
            title={t('chat_file_tip')}
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFile}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || (!value.trim() && !attachment)}
          className="w-12 h-12 rounded-xl bg-cyan-400 text-navy-900 flex items-center justify-center
                     hover:bg-cyan-300 active:scale-95 transition-all duration-150
                     disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}
