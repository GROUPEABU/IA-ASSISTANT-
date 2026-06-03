import DOMPurify from 'dompurify'

/**
 * Convertit le Markdown basique de Claude en HTML sécurisé (DOMPurify).
 * Couvre : titres, gras, italique, code (inline + blocs), listes, tableaux
 * simples, règles, sauts de ligne. Partagé par le Chat et la Veille Prix
 * (rendu streamé en direct, comme une conversation).
 */
export function mdToHtml(text) {
  if (!text) return ''
  // Escaper d'abord pour éviter les injections HTML dans le texte brut.
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Extraire les blocs ```code``` AVANT toute autre transformation.
  const codeBlocks = []
  s = s.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.replace(/\n+$/, ''))
    return ` CB${codeBlocks.length - 1} `
  })

  // ── Tableaux Markdown (| a | b |) → <table> ──────────────────────────────
  // On repère un bloc de lignes consécutives commençant par « | ». La 2e ligne
  // est la ligne de séparation (|---|---|) que l'on ignore.
  s = s.replace(/(?:^\|.*\|[ \t]*\n?)+/gm, (block) => {
    const rows = block.trim().split('\n').filter(Boolean)
    if (rows.length < 2) return block
    const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    const isSep = (row) => /^\|?[\s:-]+\|[\s:|-]*$/.test(row)
    const header = cells(rows[0])
    const bodyRows = rows.slice(1).filter(r => !isSep(r))
    const thead = `<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
    const tbody = `<tbody>${bodyRows.map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
    return `<table>${thead}${tbody}</table>\n`
  })

  s = s
    // Titres
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Règle horizontale
    .replace(/^(?:---+|\*\*\*+)$/gm, '<hr>')
    // Gras + italique combinés
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Gras
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italique
    .replace(/(?<![*])\*(?![*\s])(.+?)(?<!\s)\*(?![*])/g, '<em>$1</em>')
    // Code inline
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Listes à puce
    .replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>')
    // Regrouper les <li> consécutifs dans un <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (m) => `<ul>${m}</ul>`)
    // Paragraphes
    .replace(/\n{2,}/g, '</p><p>')
    // Saut de ligne simple
    .replace(/\n/g, '<br>')
  s = '<p>' + s + '</p>'
  // Nettoyer les balises parasites autour des blocs
  s = s.replace(/<p>(<h[1234]>)/g, '$1').replace(/(<\/h[1234]>)<\/p>/g, '$1')
  s = s.replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1')
  s = s.replace(/<p>(<table>)/g, '$1').replace(/(<\/table>)<\/p>/g, '$1')
  s = s.replace(/<p>(<hr>)<\/p>/g, '$1')
  // <br> parasites autour des tableaux/titres
  s = s.replace(/<br>\s*(<table>|<h[1234]>|<ul>|<hr>)/g, '$1')
  s = s.replace(/(<\/table>|<\/h[1234]>|<\/ul>|<hr>)\s*<br>/g, '$1')

  // Réinjecter les blocs de code.
  s = s.replace(/ CB(\d+) /g, (_, i) => `<pre><code>${codeBlocks[Number(i)]}</code></pre>`)
  s = s.replace(/<p>\s*(<pre>)/g, '$1').replace(/(<\/pre>)\s*<\/p>/g, '$1')
  s = s.replace(/<br>\s*(<pre>)/g, '$1').replace(/(<\/pre>)\s*<br>/g, '$1')

  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: ['p','h1','h2','h3','h4','strong','em','code','ul','li','br','pre','hr','table','thead','tbody','tr','th','td'],
    ALLOWED_ATTR: [],
  })
}
