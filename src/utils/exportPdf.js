export async function exportToPdf(ref, filename) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const el = ref.current
  if (!el) return
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0D273C', useCORS: true })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = (canvas.height * pdfW) / canvas.width
  let y = 0
  const pageH = pdf.internal.pageSize.getHeight()
  while (y < pdfH) {
    if (y > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH)
    y += pageH
  }
  pdf.save(filename)
}
