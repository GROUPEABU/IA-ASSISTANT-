/**
 * Construit un nom de fichier PDF lisible et homogène :
 *   ABU {Modèle} - JJ.MM.AAAA.pdf
 * Ex. "ABU Citroën C5 Aircross - 01.06.2026.pdf"
 */
export function pdfFileName(label) {
  const date = new Date()
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '.')
  const name = (label || 'Export')
    .replace(/[·|/]+/g, ' ')
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim()
  return `ABU ${name} - ${date}.pdf`
}

/**
 * Export PDF « propre » pour tous les outils.
 * Capture page par page, en-tête charte AAF Group avec bandeau véhicule,
 * pied de page paginé.
 *
 * @param {{current: HTMLElement}} ref
 * @param {string} filename
 * @param {{title?: string, subtitle?: string}} [meta]
 */
export async function exportToPdf(ref, filename, meta = {}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const el = ref.current
  if (!el) return

  // Palette charte AAF Group
  const NAVY  = [13, 39, 60]    // #0D273C
  const SLATE = [57, 63, 74]    // #393F4A
  const CYAN  = [80, 229, 229]  // #50E5E5
  const BONE  = [224, 225, 225] // #E0E1E1

  const PRINT_CSS = `
    .pdf-root, .pdf-root * {
      color: #1e293b !important;
      border-color: #e2e8f0 !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    .pdf-root { background: #ffffff !important; padding: 4px !important; }
    .pdf-root .glass-card,
    .pdf-root [class*="bg-navy"],
    .pdf-root [class*="bg-slate"] {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
    }
    .pdf-root [class*="bg-"] { background-color: #f8fafc !important; }
    .pdf-root .text-cyan-400, .pdf-root .text-cyan-300 { color: #0891b2 !important; }
    .pdf-root .text-emerald-400, .pdf-root .text-emerald-300 { color: #059669 !important; }
    .pdf-root .text-violet-400, .pdf-root .text-violet-300 { color: #7c3aed !important; }
    .pdf-root .text-warn { color: #B07D18 !important; }
    .pdf-root .text-red-400, .pdf-root .text-red-300 { color: #dc2626 !important; }
    .pdf-root svg { overflow: visible !important; }
  `
  const EXTRA_CSS = `
    .pdf-root.glass-card,
    .pdf-root[class*="bg-navy"], .pdf-root[class*="bg-slate"], .pdf-root[class*="bg-"] {
      background: #ffffff !important; border: 1px solid #e2e8f0 !important;
    }`

  const RENDER_W = 720
  const renderNode = (node) => html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    logging: false,
    windowWidth: RENDER_W,
    onclone: (doc, cloned) => {
      cloned.classList.add('pdf-root')
      const style = doc.createElement('style')
      style.textContent = PRINT_CSS + EXTRA_CSS
      doc.head.appendChild(style)
    },
  })

  let host = el
  if (host.children.length === 1 && host.firstElementChild.children.length > 1) {
    host = host.firstElementChild
  }
  const nodes = [...host.children].filter((n) => n.getBoundingClientRect().height > 0)
  const blocks = []
  for (const node of (nodes.length ? nodes : [el])) blocks.push(await renderNode(node))

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  const margin   = 12
  // headerH augmenté pour intégrer le bandeau véhicule sous le logo
  // (logo 18 mm + filet + bandeau 10 mm + gap 4 mm = 34 mm)
  const headerH  = 34
  const footerH  = 12
  const usableW  = pageW - margin * 2
  const usableH  = pageH - headerH - footerH
  const GAP_MM   = 3

  const pages = [[]]
  let yMm = 0
  const place = (canvas, srcY, srcH, hMm) => {
    pages[pages.length - 1].push({ canvas, srcY, srcH, hMm, atMm: yMm })
    yMm += hMm + GAP_MM
  }
  const newPage = () => { pages.push([]); yMm = 0 }

  for (const c of blocks) {
    const pxPerMmB = c.width / usableW
    const fullHmm  = c.height / pxPerMmB
    if (fullHmm <= usableH) {
      if (yMm + fullHmm > usableH && yMm > 0) newPage()
      place(c, 0, c.height, fullHmm)
      continue
    }
    if (yMm > 0) newPage()
    let srcY = 0
    while (srcY < c.height) {
      const availPx = Math.max(0, usableH - yMm) * pxPerMmB
      const srcH = Math.min(availPx, c.height - srcY)
      place(c, srcY, srcH, srcH / pxPerMmB)
      srcY += srcH
      if (srcY < c.height) newPage()
    }
  }
  if (pages[pages.length - 1].length === 0) pages.pop()
  const totalPages = Math.max(1, pages.length)

  const title    = meta.title || filename.replace(/_/g, ' ').replace(/\.pdf$/i, '')
  const subtitle = meta.subtitle || ''
  const dateStr  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Nettoie une chaîne pour jsPDF : élimine les espaces insécables (U+202F,
  // U+00A0, U+2009…) qui produisent un artefact "/NNN" dans le rendu,
  // et tout caractère hors Latin-1 que jsPDF Helvetica ne peut pas encoder.
  const pdfSafe = (str) => str
    .replace(/ | | |⁠|﻿/g, ' ')
    .replace(/[^\x20-\xFF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const drawHeader = () => {
    // ── Logo mark ─────────────────────────────────────────────────
    pdf.setFillColor(...NAVY)
    pdf.circle(margin + 2.1, 10.5, 2, 'F')
    pdf.setDrawColor(...CYAN)
    pdf.setLineWidth(0.8)
    pdf.circle(margin + 4.6, 10.5, 2, 'S')

    // ── Wordmark (gauche) ─────────────────────────────────────────
    pdf.setTextColor(...NAVY)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('AUTOBUYUNION', margin + 9.5, 10)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...SLATE)
    pdf.text('AAF Group · Espace membres', margin + 9.5, 14.5)

    // ── Outil + date (droite) ─────────────────────────────────────
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...NAVY)
    pdf.text(pdfSafe(title), pageW - margin, 10, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...SLATE)
    pdf.text(dateStr, pageW - margin, 14.5, { align: 'right' })

    // ── Filet séparateur fin ──────────────────────────────────────
    pdf.setDrawColor(...BONE)
    pdf.setLineWidth(0.35)
    pdf.line(margin, 18.5, pageW - margin, 18.5)
    pdf.setDrawColor(...CYAN)
    pdf.setLineWidth(1.2)
    pdf.line(margin, 18.5, margin + 22, 18.5)

    // ── Bandeau véhicule / modèle (navy pleine largeur) ───────────
    if (subtitle) {
      const BY = 20.5
      const BH = 9.5
      pdf.setFillColor(...NAVY)
      pdf.rect(margin, BY, usableW, BH, 'F')
      // Barre d'accent cyan (gauche)
      pdf.setFillColor(...CYAN)
      pdf.rect(margin, BY, 2.5, BH, 'F')
      // Nom du modèle en blanc
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(255, 255, 255)
      pdf.text(pdfSafe(subtitle), margin + 5.5, BY + 6.2)
    }
  }

  const drawFooter = (page) => {
    pdf.setDrawColor(...BONE)
    pdf.setLineWidth(0.35)
    pdf.line(margin, pageH - footerH + 4, pageW - margin, pageH - footerH + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...SLATE)
    pdf.text('AAF Group · Autobuyunion', margin, pageH - 5)
    pdf.text(`Page ${page} / ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  pages.forEach((items, i) => {
    const page = i + 1
    if (page > 1) pdf.addPage()
    drawHeader()
    drawFooter(page)

    for (const it of items) {
      let img = it.canvas
      if (it.srcY !== 0 || it.srcH !== it.canvas.height) {
        const slice = document.createElement('canvas')
        slice.width = it.canvas.width
        slice.height = it.srcH
        const ctx = slice.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, slice.width, it.srcH)
        ctx.drawImage(it.canvas, 0, it.srcY, it.canvas.width, it.srcH, 0, 0, it.canvas.width, it.srcH)
        img = slice
      }
      const imgData = img.toDataURL('image/jpeg', 0.92)
      pdf.addImage(imgData, 'JPEG', margin, headerH + it.atMm, usableW, it.hMm)
    }
  })

  pdf.save(filename)
}
