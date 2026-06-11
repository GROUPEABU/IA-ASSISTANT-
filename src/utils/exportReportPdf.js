/**
 * Export PDF NATIF d'un rapport Markdown (Veille Prix).
 *
 * Contrairement à exportToPdf (capture html2canvas, rendu « image » parfois
 * flou), on rend ici du TEXTE jsPDF réel : titres, paragraphes, puces et
 * tableaux Markdown → document net, sélectionnable, léger, à la charte AAF.
 *
 * @param {string} markdown — le rapport (sortie streamée de l'IA)
 * @param {string} filename
 * @param {{title?: string, subtitle?: string}} [meta]
 */
export async function exportReportPdf(markdown, filename, meta = {}) {
  const jspdfMod = await import('jspdf')
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default

  // Charte AAF Group
  const NAVY  = [13, 39, 60]
  const SLATE = [57, 63, 74]
  const CYAN  = [80, 229, 229]
  const BONE  = [224, 225, 225]
  const INK   = [30, 41, 59]

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 14
  const headerH = 34
  const footerH = 12
  const usableW = pageW - margin * 2
  const bottomY = pageH - footerH - 4

  const title    = meta.title || 'Veille prix'
  const subtitle = meta.subtitle || ''
  const dateStr  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Nettoie pour Helvetica (WinAnsi) : garde le EUR (supporte), convertit les
  // tirets typographiques en '-', les guillemets courbes, retire les emojis.
  const DASHES = /[\u2013\u2014\u2212]/g
  const SPACES = /[\u202F\u00A0\u2009\u2060\uFEFF]/g
  const sanitize = (str) => (str || '')
    .replace(SPACES, ' ')
    .replace(DASHES, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\xFF\u20AC]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
  // Variante titres / cellules : on peut rogner les bords.
  const pdfSafe = (str) => sanitize(str).trim()

  // Convertit le gras **…** en segments {text, bold}.
  const parseInline = (line) => {
    const segs = []
    let rest = line
    const re = /\*\*(.+?)\*\*/
    let m
    while ((m = re.exec(rest))) {
      if (m.index > 0) segs.push({ text: rest.slice(0, m.index), bold: false })
      segs.push({ text: m[1], bold: true })
      rest = rest.slice(m.index + m[0].length)
    }
    if (rest) segs.push({ text: rest, bold: false })
    return segs.map(s => ({ text: sanitize(s.text), bold: s.bold })).filter(s => s.text)
  }

  // ── En-tête / pied (répétés à chaque page) ────────────────────────────────
  const drawHeader = () => {
    pdf.setFillColor(...NAVY); pdf.circle(margin + 2.1, 10.5, 2, 'F')
    pdf.setDrawColor(...CYAN); pdf.setLineWidth(0.8); pdf.circle(margin + 4.6, 10.5, 2, 'S')
    pdf.setTextColor(...NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('AUTOBUYUNION', margin + 9.5, 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...SLATE)
    pdf.text('AAF Group - Espace membres', margin + 9.5, 14.5)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...NAVY)
    pdf.text(pdfSafe(title), pageW - margin, 10, { align: 'right' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...SLATE)
    pdf.text(dateStr, pageW - margin, 14.5, { align: 'right' })
    pdf.setDrawColor(...BONE); pdf.setLineWidth(0.35); pdf.line(margin, 18.5, pageW - margin, 18.5)
    pdf.setDrawColor(...CYAN); pdf.setLineWidth(1.2); pdf.line(margin, 18.5, margin + 22, 18.5)
    if (subtitle) {
      const BY = 20.5, BH = 9.5
      pdf.setFillColor(...NAVY); pdf.rect(margin, BY, usableW, BH, 'F')
      pdf.setFillColor(...CYAN); pdf.rect(margin, BY, 2.5, BH, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(255, 255, 255)
      pdf.text(pdfSafe(subtitle), margin + 5.5, BY + 6.2)
    }
  }
  let pageNo = 0
  const drawFooter = () => {
    pdf.setDrawColor(...BONE); pdf.setLineWidth(0.35)
    pdf.line(margin, pageH - footerH + 4, pageW - margin, pageH - footerH + 4)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...SLATE)
    pdf.text('AAF Group - Autobuyunion', margin, pageH - 5)
    pdf.text(`Page ${pageNo}`, pageW - margin, pageH - 5, { align: 'right' })
  }
  const newPage = () => { pdf.addPage(); pageNo++; drawHeader(); drawFooter() }

  pageNo = 1; drawHeader(); drawFooter()
  let y = headerH + 2

  const ensure = (h) => { if (y + h > bottomY) newPage(), (y = headerH + 2) }

  // ── Parsing Markdown en blocs ─────────────────────────────────────────────
  const lines = markdown.replace(/\r/g, '').split('\n')
  let i = 0
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l)
  const isSep = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes('-')

  while (i < lines.length) {
    let line = lines[i]

    // Lignes vides → petit espacement
    if (!line.trim()) { y += 2; i++; continue }

    // Titres
    if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^(#{1,4})/)[1].length
      const txt = pdfSafe(line.replace(/^#{1,4}\s+/, ''))
      const size = level <= 2 ? 12 : level === 3 ? 10.5 : 9.5
      const headLh = level <= 2 ? 5.5 : 4.5
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(size)
      // Découpe le titre sur la largeur utile pour éviter le débordement.
      const headLines = pdf.splitTextToSize(txt, usableW)
      // Hauteur totale du bloc (toutes les lignes + espacement de tête niveau ≤ 2)
      // pour qu'un titre long en bas de page bascule proprement.
      const topGap = level <= 2 ? 3 : 0
      ensure(topGap + headLines.length * headLh)
      if (level <= 2) y += 3
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(size)
      pdf.setTextColor(...(level <= 2 ? NAVY : SLATE))
      headLines.forEach((hl, idx) => {
        pdf.text(hl, margin, y)
        if (idx < headLines.length - 1) y += headLh
      })
      if (level <= 2) {
        // filet cyan sous les sections de niveau 2 (sous la DERNIÈRE ligne)
        pdf.setDrawColor(...CYAN); pdf.setLineWidth(0.8)
        pdf.line(margin, y + 1.6, margin + 18, y + 1.6)
        y += 5.5
      } else { y += 4.5 }
      i++; continue
    }

    // Règle horizontale
    if (/^(?:---+|\*\*\*+)$/.test(line.trim())) {
      ensure(4); pdf.setDrawColor(...BONE); pdf.setLineWidth(0.3)
      pdf.line(margin, y, pageW - margin, y); y += 4; i++; continue
    }

    // Tableau
    if (isTableRow(line)) {
      const rows = []
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isSep(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => pdfSafe(c.trim())))
        }
        i++
      }
      if (rows.length) {
        const cols = Math.max(...rows.map(r => r.length))
        const colW = usableW / cols
        const cellPad = 1.8
        const lineH = 4.2
        pdf.setFontSize(8)
        rows.forEach((row, ri) => {
          // hauteur de la ligne = max des wraps
          const wraps = row.map(c => pdf.splitTextToSize(c, colW - cellPad * 2))
          const rowH = Math.max(lineH, ...wraps.map(w => w.length * lineH)) + 2
          ensure(rowH)
          if (ri === 0) { pdf.setFillColor(236, 248, 250); pdf.rect(margin, y, usableW, rowH, 'F') }
          pdf.setDrawColor(...BONE); pdf.setLineWidth(0.25)
          for (let c = 0; c < cols; c++) {
            const x = margin + c * colW
            pdf.rect(x, y, colW, rowH, 'S')
            pdf.setFont('helvetica', ri === 0 ? 'bold' : 'normal')
            pdf.setTextColor(...(ri === 0 ? NAVY : INK))
            const w = wraps[c] || ['']
            w.forEach((wl, li) => pdf.text(wl, x + cellPad, y + cellPad + 3 + li * lineH))
          }
          y += rowH
        })
        y += 2
      }
      continue
    }

    // Puce
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '')
      const segs = parseInline(content)
      const indent = margin + 4
      const textW = usableW - 4
      // wrap : on assemble le texte brut pour mesurer, puis on re-render segment par segment
      const plain = segs.map(s => s.text).join('')
      const wrapped = pdf.splitTextToSize(plain, textW)
      ensure(wrapped.length * 4.6 + 1)
      pdf.setFillColor(...CYAN); pdf.circle(margin + 1.3, y - 1.1, 0.7, 'F')
      pdf.setFontSize(9.5); renderSegsWrapped(segs, indent, textW, 4.6)
      y += 1
      i++; continue
    }

    // Paragraphe (peut contenir du gras)
    {
      const segs = parseInline(line)
      const plain = segs.map(s => s.text).join('')
      const wrapped = pdf.splitTextToSize(plain, usableW)
      ensure(wrapped.length * 4.6 + 1)
      pdf.setFontSize(9.5); renderSegsWrapped(segs, margin, usableW, 4.6)
      y += 1.5
      i++; continue
    }
  }

  // Rend des segments (gras/normal) avec retour à la ligne sur largeur maxW.
  function renderSegsWrapped(segs, x0, maxW, lh) {
    let x = x0
    pdf.setTextColor(...INK)
    const space = pdf.getStringUnitWidth(' ') * 9.5 / pdf.internal.scaleFactor
    for (const seg of segs) {
      pdf.setFont('helvetica', seg.bold ? 'bold' : 'normal')
      const words = seg.text.split(/(\s+)/) // garde les espaces
      for (const w of words) {
        if (!w) continue
        const ww = pdf.getStringUnitWidth(w) * 9.5 / pdf.internal.scaleFactor
        if (x + ww > x0 + maxW && x > x0) { y += lh; x = x0; ensure(lh) }
        pdf.text(w, x, y)
        x += ww
      }
    }
    y += lh
  }

  // Hook de test (inerte en production) : permet de capturer le doc jsPDF pour
  // inspection au lieu de déclencher le téléchargement.
  if (typeof globalThis !== 'undefined' && globalThis.__PDF_TEST_SINK__) {
    globalThis.__PDF_TEST_SINK__(pdf, filename)
    return
  }
  // output 'blob' : renvoie le PDF (partage Web Share API) au lieu de le télécharger.
  if (meta.output === 'blob') return pdf.output('blob')
  pdf.save(filename)
}
