/**
 * Markdown → texte brut lisible, prêt à coller dans WhatsApp / e-mail / SMS.
 * Titres en MAJUSCULES, tableaux aplatis en lignes « a — b — c », puces « • ».
 */
export function mdToPlainText(md) {
  if (!md) return ''
  let s = String(md)

  // Tableaux : supprime les lignes séparatrices, aplatit les lignes de cellules.
  s = s
    .split('\n')
    .map((line) => {
      const l = line.trim()
      if (/^\|[\s\-:|]+\|?$/.test(l)) return null // ligne |---|---|
      if (l.startsWith('|')) {
        return l
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
          .join(' — ')
      }
      return line
    })
    .filter((l) => l !== null)
    .join('\n')

  s = s.replace(/^#{1,6}\s*(.+)$/gm, (_, t) => `\n${t.trim().toUpperCase()}`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
  s = s.replace(/^[-*]\s+/gm, '• ')
  s = s.replace(/`{1,3}/g, '')
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}

/** Écrit `text` dans le presse-papiers, avec repli pour contextes sans Clipboard API. */
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Repli (HTTP, vieux navigateurs).
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

/** Copie le rapport en texte brut LISIBLE (titres, puces, tableaux aplatis). */
export async function copyReportText(md) {
  const text = mdToPlainText(md)
  await writeClipboard(text)
  return text
}

/** Copie les DONNÉES BRUTES (rapport tel quel, Markdown non transformé). */
export async function copyRawText(md) {
  const text = String(md || '')
  await writeClipboard(text)
  return text
}
