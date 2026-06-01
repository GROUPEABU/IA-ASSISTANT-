/**
 * Construit un nom de fichier PDF court et homogène :
 *   ABU-{Modèle}-JJ-MM-AAAA.pdf
 * Le libellé est nettoyé (accents/espaces → tirets, caractères spéciaux retirés)
 * et tronqué pour rester court et lisible.
 *
 * @param {string} label  modèle ou intitulé (ex. "C5 Aircross Hybrid 145")
 * @returns {string}
 */
export function pdfFileName(label) {
  const date = new Date()
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-')
  const slug = (label || 'export')
    .replace(/[·|/]+/g, ' ')           // séparateurs → espace
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '') // ne garder que lettres/chiffres/accents/espaces/tirets
    .trim()
    .replace(/\s+/g, '-')               // espaces → tiret unique
    .replace(/-+/g, '-')                // tirets multiples → un seul
    .slice(0, 28)
    .replace(/-$/, '')                  // pas de tiret final après troncature
  return `ABU-${slug}-${date}.pdf`
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

  // Palette d'impression
  const NAVY = [13, 39, 60]
  const CYAN = [8, 145, 178]
  const GRAY = [100, 116, 139]
  const LINE = [203, 213, 225]

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
    .pdf-root .text-amber-400, .pdf-root .text-amber-300 { color: #d97706 !important; }
    .pdf-root .text-red-400, .pdf-root .text-red-300 { color: #dc2626 !important; }
  `

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    onclone: (doc, cloned) => {
      cloned.classList.add('pdf-root')
      const style = doc.createElement('style')
      style.textContent = PRINT_CSS
      doc.head.appendChild(style)
    },
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  const margin   = 12
  const headerH  = 24   // hauteur réservée à l'en-tête
  const footerH  = 12   // hauteur réservée au pied de page
  const usableW  = pageW - margin * 2
  const usableH  = pageH - headerH - footerH

  const pxPerMm  = canvas.width / usableW
  const sliceHpx = usableH * pxPerMm
  const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHpx))

  const title    = meta.title || filename.replace(/_/g, ' ').replace(/\.pdf$/i, '')
  const subtitle = meta.subtitle || ''
  const dateStr  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const drawHeader = () => {
    // Marque
    pdf.setFillColor(...CYAN)
    pdf.circle(margin + 1.6, 11, 1.8, 'F')
    pdf.setTextColor(...NAVY)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('AUTOBUYUNION', margin + 5, 12.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...GRAY)
    pdf.text('Espace membres', margin + 5, 16.5)

    // Bloc droit : titre + date
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...NAVY)
    pdf.text(title, pageW - margin, 11.5, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...GRAY)
    pdf.text(dateStr, pageW - margin, 16, { align: 'right' })

    // Filet séparateur + accent cyan
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(margin, 20, pageW - margin, 20)
    pdf.setDrawColor(...CYAN)
    pdf.setLineWidth(1)
    pdf.line(margin, 20, margin + 28, 20)
  }

  const drawFooter = (page) => {
    pdf.setDrawColor(...LINE)
    pdf.setLineWidth(0.3)
    pdf.line(margin, pageH - footerH + 4, pageW - margin, pageH - footerH + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...GRAY)
    const left = subtitle ? `Autobuyunion · ${subtitle}` : 'Autobuyunion · Espace membres'
    pdf.text(left, margin, pageH - 5)
    pdf.text(`Page ${page} / ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  let renderedPx = 0
  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) pdf.addPage()
    drawHeader()
    drawFooter(page)

    const h = Math.min(sliceHpx, canvas.height - renderedPx)
    if (h <= 0) break

    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = h
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, h)
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, h, 0, 0, canvas.width, h)

    const imgData = slice.toDataURL('image/jpeg', 0.92)
    pdf.addImage(imgData, 'JPEG', margin, headerH, usableW, h / pxPerMm)
    renderedPx += h
  }

  pdf.save(filename)
}
