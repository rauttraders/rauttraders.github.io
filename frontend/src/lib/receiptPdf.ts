import logoUrl from '../assets/sortlogo.png'
import type { ReceiptOrder } from '../components/Order/OrderReceipt'
import { formatINR } from './format'

interface PdfBusiness {
  businessName?: string
  businessPhone?: string
  businessAddress?: string
}

const A4_W = 595
const A4_H = 842

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/)
  if (!words.length || !words[0]) return []
  const lines: string[] = []
  let line = words[0]
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
    } else {
      lines.push(line)
      line = words[i]
    }
  }
  lines.push(line)
  return lines
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.closePath()
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

interface PageImage {
  jpegBytes: Uint8Array
  pxW: number
  pxH: number
}

/** Builds a valid multi-page A4 PDF 1.4 binary from one or more JPEG page slices. */
function buildMultiPageA4Pdf(pages: PageImage[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = [0]
  let pos = 0

  const pushStr = (s: string) => {
    const b = enc.encode(s)
    chunks.push(b)
    pos += b.length
  }
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b)
    pos += b.length
  }

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

  offsets.push(pos)
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  const pageIds = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  offsets.push(pos)
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [${pageIds}] /Count ${pages.length} >>\nendobj\n`)

  pages.forEach((p, i) => {
    const pageObjId = 3 + i * 3
    const imgObjId = 4 + i * 3
    const contentObjId = 5 + i * 3
    const drawH = Math.round((p.pxH / p.pxW) * A4_W * 100) / 100
    const drawY = Math.max(0, A4_H - drawH)

    offsets.push(pos)
    pushStr(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    )

    offsets.push(pos)
    pushStr(
      `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`,
    )
    pushBytes(p.jpegBytes)
    pushStr('\nendstream\nendobj\n')

    const content = `q ${A4_W} 0 0 ${drawH} 0 ${drawY} cm /Im0 Do Q\n`
    offsets.push(pos)
    pushStr(`${contentObjId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)
  })

  const xrefPos = pos
  pushStr(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`)
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }
  pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`)

  const pdf = new Uint8Array(pos)
  let writeAt = 0
  for (const c of chunks) {
    pdf.set(c, writeAt)
    writeAt += c.length
  }
  return pdf
}

/** Generates a real multi-page A4 PDF File of the order receipt so every item and detail is visible. */
export async function generateReceiptPdfFile(order: ReceiptOrder, biz: PdfBusiness): Promise<File> {
  const businessName = biz.businessName?.trim() || 'Raut Traders'
  const W = 840
  const pageSliceH = Math.floor((A4_H / A4_W) * W)
  const padX = 48
  const innerW = W - padX * 2
  const font = "'Nunito', 'Noto Sans', system-ui, -apple-system, sans-serif"

  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  mctx.font = `700 23px ${font}`
  const itemRows = order.items.map((item) => {
    const nameLines = wrapText(mctx, item.name, 330)
    const meta = `${item.company}${item.size && item.size !== '0' ? ` · ${item.size}` : ''}`
    const rowH = Math.max(66, nameLines.length * 28 + (meta ? 34 : 16))
    return { item, nameLines, meta, rowH }
  })

  mctx.font = `500 20px ${font}`
  const addressLines = biz.businessAddress ? wrapText(mctx, biz.businessAddress, innerW) : []

  const customerRows: [string, string][] = []
  if (order.customer?.name) customerRows.push(['Name', order.customer.name])
  if (order.customer?.phone) customerRows.push(['Phone', order.customer.phone])
  if (order.customer?.email) customerRows.push(['Email', order.customer.email])

  const headerH = 126
  const introTopY = headerH + 40 + 66 + 34 + 36 + 38
  const detailsEndY = introTopY + 42 * (3 + customerRows.length) + 34 + 38
  const itemsStartY = detailsEndY + 38 + 16

  let simY = itemsStartY
  const itemOffsets: number[] = []
  for (const row of itemRows) {
    const pageEnd = Math.ceil((simY + 1) / pageSliceH) * pageSliceH
    if (simY + row.rowH > pageEnd - 24) {
      simY = pageEnd + 36
    }
    itemOffsets.push(simY)
    simY += row.rowH
  }

  const summaryBlockH = 22 + 38 + 42 * 2 + 28 + 82 + 28
  const footerBlockH = 42 + 38 + 30 + (biz.businessPhone ? 28 : 0) + addressLines.length * 26 + 44
  let summaryY = simY
  const summaryPageEnd = Math.ceil((summaryY + 1) / pageSliceH) * pageSliceH
  if (summaryY + summaryBlockH + footerBlockH > summaryPageEnd - 18) {
    if (summaryBlockH + footerBlockH < pageSliceH - 60) {
      summaryY = summaryPageEnd + 36
    }
  }
  const totalH = summaryY + summaryBlockH + footerBlockH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = totalH
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)

  ctx.fillStyle = '#ef5350'
  ctx.fillRect(0, 0, W, headerH)

  const logo = await loadImage(logoUrl)
  let nameX = padX
  if (logo) {
    const lh = 56
    const lw = Math.round((logo.width / logo.height) * lh)
    const lc = document.createElement('canvas')
    lc.width = lw
    lc.height = lh
    const lctx = lc.getContext('2d')!
    lctx.drawImage(logo, 0, 0, lw, lh)
    lctx.globalCompositeOperation = 'source-in'
    lctx.fillStyle = '#ffffff'
    lctx.fillRect(0, 0, lw, lh)
    ctx.drawImage(lc, padX, 34)
    nameX = padX + lw + 18
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = `800 30px ${font}`
  ctx.fillText(businessName, nameX, 72)

  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  roundRectPath(ctx, W - padX - 134, 42, 134, 40, 20)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 20px ${font}`
  ctx.textAlign = 'center'
  ctx.fillText('RECEIPT', W - padX - 67, 69)
  ctx.textAlign = 'left'

  let y = headerH + 40

  ctx.fillStyle = '#e6f9f1'
  roundRectPath(ctx, padX, y, 148, 36, 18)
  ctx.fill()
  ctx.fillStyle = '#1baf7a'
  ctx.font = `700 19px ${font}`
  ctx.textAlign = 'center'
  ctx.fillText('CONFIRMED', padX + 74, y + 25)
  ctx.textAlign = 'left'

  y += 66
  ctx.fillStyle = '#111111'
  ctx.font = `800 36px ${font}`
  ctx.fillText('Order placed!', padX, y)

  y += 34
  ctx.fillStyle = '#596579'
  ctx.font = `500 23px ${font}`
  ctx.fillText('Thank you for shopping with us', padX, y)

  const drawDivider = (atY: number) => {
    ctx.save()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(padX, atY)
    ctx.lineTo(W - padX, atY)
    ctx.stroke()
    ctx.restore()
  }

  y += 36
  drawDivider(y)
  y += 38

  ctx.fillStyle = '#596579'
  ctx.font = `700 19px ${font}`
  ctx.fillText('ORDER DETAILS', padX, y)

  const fmtDate = new Date(order.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const drawRow = (label: string, val: string, valColor: string, boldVal = true) => {
    y += 42
    ctx.fillStyle = '#596579'
    ctx.font = `500 24px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(label, padX, y)
    ctx.fillStyle = valColor
    ctx.font = `${boldVal ? 700 : 600} 24px ${font}`
    ctx.textAlign = 'right'
    ctx.fillText(val, W - padX, y)
    ctx.textAlign = 'left'
  }

  drawRow('Order ID', order.id, '#ef5350')
  drawRow('Date & Time', fmtDate, '#111111', false)
  drawRow('Status', 'Confirmed', '#1baf7a')
  for (const [lbl, val] of customerRows) {
    drawRow(lbl, val, '#111111', false)
  }

  y += 34
  drawDivider(y)
  y += 38

  ctx.fillStyle = '#596579'
  ctx.font = `700 19px ${font}`
  ctx.fillText('ITEMS ORDERED', padX, y)

  y += 38
  ctx.font = `700 19px ${font}`
  ctx.fillText('PRODUCT', padX, y)
  ctx.textAlign = 'center'
  ctx.fillText('QTY', padX + 410, y)
  ctx.textAlign = 'right'
  ctx.fillText('RATE', padX + 565, y)
  ctx.fillText('AMOUNT', W - padX, y)
  ctx.textAlign = 'left'

  itemRows.forEach((row, idx) => {
    const ry = itemOffsets[idx]
    if (idx % 2 === 0) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(padX - 8, ry, innerW + 16, row.rowH)
    }
    let ty = ry + 30
    ctx.fillStyle = '#111111'
    ctx.font = `700 23px ${font}`
    row.nameLines.forEach((ln) => {
      ctx.fillText(ln, padX, ty)
      ty += 28
    })
    if (row.meta) {
      ctx.fillStyle = '#596579'
      ctx.font = `500 20px ${font}`
      ctx.fillText(row.meta, padX, ty)
    }

    const midY = ry + 32
    ctx.fillStyle = '#111111'
    ctx.font = `700 23px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(String(row.item.qty), padX + 410, midY)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#596579'
    ctx.font = `500 22px ${font}`
    ctx.fillText(formatINR(row.item.price), padX + 565, midY)
    ctx.fillStyle = '#111111'
    ctx.font = `700 23px ${font}`
    ctx.fillText(formatINR(row.item.price * row.item.qty), W - padX, midY)
    ctx.textAlign = 'left'
  })

  y = summaryY + 22
  drawDivider(y)
  y += 38

  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
  const units = order.items.reduce((s, i) => s + i.qty, 0)
  ctx.fillStyle = '#596579'
  ctx.font = `700 19px ${font}`
  ctx.fillText('PAYMENT SUMMARY', padX, y)

  drawRow(`Subtotal (${units} items)`, formatINR(subtotal), '#111111', false)
  drawRow('Delivery', 'As agreed on WhatsApp', '#1baf7a', false)

  y += 28
  ctx.fillStyle = '#fff4f4'
  roundRectPath(ctx, padX, y, innerW, 82, 20)
  ctx.fill()
  ctx.fillStyle = '#111111'
  ctx.font = `700 27px ${font}`
  ctx.fillText('Total', padX + 26, y + 51)
  ctx.fillStyle = '#ef5350'
  ctx.font = `800 38px ${font}`
  ctx.textAlign = 'right'
  ctx.fillText(formatINR(order.total), W - padX - 26, y + 54)
  ctx.textAlign = 'left'

  y += 110
  drawDivider(y)
  y += 42

  ctx.textAlign = 'center'
  ctx.fillStyle = '#596579'
  ctx.font = `700 19px ${font}`
  ctx.fillText(order.id, W / 2, y)

  y += 38
  ctx.fillStyle = '#111111'
  ctx.font = `700 24px ${font}`
  ctx.fillText('Thank you for your order!', W / 2, y)

  y += 30
  ctx.fillStyle = '#596579'
  ctx.font = `500 20px ${font}`
  ctx.fillText('Your order confirmation is shared via WhatsApp.', W / 2, y)

  if (biz.businessPhone) {
    y += 28
    ctx.fillText(`Queries? Call: ${biz.businessPhone}`, W / 2, y)
  }
  for (const ln of addressLines) {
    y += 26
    ctx.fillText(ln, W / 2, y)
  }

  ctx.fillStyle = '#ef5350'
  ctx.fillRect(0, totalH - 18, W, 18)

  const pageCount = Math.max(1, Math.ceil(totalH / pageSliceH))
  const pages: PageImage[] = []
  for (let p = 0; p < pageCount; p++) {
    const srcY = p * pageSliceH
    const sliceH = Math.min(pageSliceH, totalH - srcY)
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = W
    sliceCanvas.height = sliceH
    const sctx = sliceCanvas.getContext('2d')!
    sctx.fillStyle = '#ffffff'
    sctx.fillRect(0, 0, W, sliceH)
    sctx.drawImage(canvas, 0, srcY, W, sliceH, 0, 0, W, sliceH)
    const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.92)
    pages.push({
      jpegBytes: base64ToBytes(dataUrl.split(',')[1]),
      pxW: W,
      pxH: sliceH,
    })
  }

  const pdfBytes = buildMultiPageA4Pdf(pages)
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  return new File([blob], `Receipt-${order.id}.pdf`, { type: 'application/pdf' })
}
