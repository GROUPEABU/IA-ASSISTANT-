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

// Au-delà de cette longueur, le corps du mailto: peut être tronqué par
// certains clients/navigateurs — on bascule alors sur le presse-papiers.
const MAILTO_BODY_LIMIT = 1500

/**
 * Ouvre le client mail de l'utilisateur avec le rapport en texte brut.
 * Si le rapport est trop long pour un mailto:, on tronque le corps et on
 * copie la version complète dans le presse-papiers (100% client-side).
 * @returns {Promise<{ truncated: boolean }>}
 */
export async function shareReportByEmail(md, subject = 'Autobuyunion') {
  const text = mdToPlainText(md)
  let body = text
  let truncated = false
  if (body.length > MAILTO_BODY_LIMIT) {
    truncated = true
    try { await navigator.clipboard.writeText(text) } catch { /* presse-papiers indisponible */ }
    body = body.slice(0, MAILTO_BODY_LIMIT).trimEnd() +
      '\n\n[…] — version complète copiée dans le presse-papiers, collez-la ci-dessous.'
  }
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  try { window.location.href = href } catch { /* SSR/no-op */ }
  return { truncated }
}

/** Copie le rapport en texte brut dans le presse-papiers (avec repli legacy). */
export async function copyReportText(md) {
  const text = mdToPlainText(md)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Repli pour contextes sans Clipboard API (HTTP, vieux navigateurs).
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  return text
}
