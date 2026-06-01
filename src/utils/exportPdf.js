/**
 * Construit un nom de fichier PDF lisible et homogène :
 *   ABU {Modèle} - JJ.MM.AAAA.pdf
 * Ex. "ABU Citroën C5 Aircross - 01.06.2026.pdf"
 * Le libellé conserve ses espaces (plus lisible), seuls les séparateurs
 * internes et caractères spéciaux sont nettoyés.
 *
 * @param {string} label  modèle ou intitulé (ex. "C5 Aircross Hybrid 145")
 * @returns {string}
 */
export function pdfFileName(label) {
  const date = new Date()
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '.')
  const name = (label || 'Export')
    .replace(/[·|/]+/g, ' ')            // séparateurs internes → espace
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ') // caractères spéciaux → espace
    .replace(/\s+/g, ' ')               // espaces multiples → un seul
    .trim()
    .slice(0, 40)
    .trim()
  return `ABU ${name} - ${date}.pdf`
}

/**
 * Export PDF « propre » pour tous les outils.
 *
 * Au lieu de capturer l'UI sombre telle quelle (illisible à l'impression,
 * fichier énorme), on :
 *  1. recolore le contenu en sombre-sur-blanc via un clone (onclone),
 *  2. capture en JPEG (fichier léger),
 *  3. découpe proprement en pages A4,
 *  4. ajoute un en-tête Autobuyunion + pied de page paginé sur chaque page.
 *
 * @param {{current: HTMLElement}} ref  conteneur à exporter
 * @param {string} filename             nom du fichier .pdf
 * @param {{title?: string, subtitle?: string}} [meta]
 */
export async function exportToPdf(ref, filename, meta = {}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const el = ref.current
  if (!el) return

  // Palette d'impression — charte AAF Group (fond blanc, logo version Navy)
  const NAVY = [13, 39, 60]    // #0D273C — primaire (texte, logo sur fond clair)
  const SLATE = [57, 63, 74]   // #393F4A — secondaire (sous-titres)
  const CYAN = [80, 229, 229]  // #50E5E5 — accent (filet, cercle accent)
  const BONE = [224, 225, 225] // #E0E1E1 — neutre (filets séparateurs)
  // NB : dans le corps, le cyan est assombri (#0891b2) via PRINT_CSS pour
  // rester lisible sur blanc (le #50E5E5 charte est réservé aux fonds foncés).

  // CSS d'impression injecté uniquement dans le clone (page live intacte)
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
    /* Accents conservés mais assombris pour rester lisibles sur blanc */
    .pdf-root .text-cyan-400, .pdf-root .text-cyan-300 { color: #0891b2 !important; }
    .pdf-root .text-emerald-400, .pdf-root .text-emerald-300 { color: #059669 !important; }
    .pdf-root .text-violet-400, .pdf-root .text-violet-300 { color: #7c3aed !important; }
    .pdf-root .text-warn { color: #B07D18 !important; }
    .pdf-root .text-red-400, .pdf-root .text-red-300 { color: #dc2626 !important; }
    .pdf-root svg { overflow: visible !important; }
  `

  // ── Rendu bloc par bloc ───────────────────────────────────────────────────
  // Chaque bloc de premier niveau est capturé séparément puis empilé page par
  // page : un bloc n'est JAMAIS coupé en deux (sauf s'il dépasse une page
  // entière, où il est alors tranché seul). windowWidth fige la largeur de mise
  // en page → rendu identique sur mobile comme sur desktop. Largeur < md (768)
  // pour forcer une colonne unique : libellés/valeurs alignés, plus lisible.
  const RENDER_W = 720

  // Recolore aussi l'élément racine capturé (et pas seulement ses descendants).
  const EXTRA_CSS = `
    .pdf-root.glass-card,
    .pdf-root[class*="bg-navy"], .pdf-root[class*="bg-slate"], .pdf-root[class*="bg-"] {
      background: #ffffff !important; border: 1px solid #e2e8f0 !important;
    }`

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

  // Blocs de premier niveau (on descend un éventuel wrapper unique).
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
  const headerH  = 24   // hauteur réservée à l'en-tête
  const footerH  = 12   // hauteur réservée au pied de page
  const usableW  = pageW - margin * 2
  const usableH  = pageH - headerH - footerH
  const GAP_MM   = 3    // espace entre deux blocs

  // ── Mise en page : empile les blocs, saut de page dès qu'un bloc ne tient pas.
  //    Chaque entrée = { canvas, srcY, srcH, hMm, atMm } à dessiner.
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
    // Bloc plus haut qu'une page entière → on le tranche (cas rare).
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

  const drawHeader = () => {
    // Logo mark — « deux cercles, un seul mouvement » (charte AAF Group)
    // Version Navy pour fond clair ; un cercle accent cyan en chevauchement.
    const cy = 11
    pdf.setFillColor(...NAVY)
    pdf.circle(margin + 2.1, cy, 2, 'F')
    pdf.setDrawColor(...CYAN)
    pdf.setLineWidth(0.8)
    pdf.circle(margin + 4.6, cy, 2, 'S')

    // Wordmark + rattachement marque maître
    pdf.setTextColor(...NAVY)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('AUTOBUYUNION', margin + 9.5, 10.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...SLATE)
    pdf.text('AAF Group · Espace membres', margin + 9.5, 15)

    // Bloc droit : titre + date
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...NAVY)
    pdf.text(title, pageW - margin, 10.5, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...SLATE)
    pdf.text(dateStr, pageW - margin, 15, { align: 'right' })

    // Filet séparateur (bone) + accent cyan court
    pdf.setDrawColor(...BONE)
    pdf.setLineWidth(0.4)
    pdf.line(margin, 19.5, pageW - margin, 19.5)
    pdf.setDrawColor(...CYAN)
    pdf.setLineWidth(1.3)
    pdf.line(margin, 19.5, margin + 24, 19.5)
  }

  const drawFooter = (page) => {
    pdf.setDrawColor(...BONE)
    pdf.setLineWidth(0.4)
    pdf.line(margin, pageH - footerH + 4, pageW - margin, pageH - footerH + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...SLATE)
    const left = subtitle ? `AAF Group · ${subtitle}` : 'AAF Group · Autobuyunion'
    pdf.text(left, margin, pageH - 5)
    pdf.text(`Page ${page} / ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  pages.forEach((items, i) => {
    const page = i + 1
    if (page > 1) pdf.addPage()
    drawHeader()
    drawFooter(page)

    for (const it of items) {
      let img = it.canvas
      // Sous-tranche uniquement pour un bloc plus haut qu'une page.
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
