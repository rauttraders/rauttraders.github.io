import logoUrl from '../assets/sortlogo.png'
import type { ReceiptOrder } from '../components/Order/OrderReceipt'
import { formatINR } from './format'

interface PdfBusiness {
  businessName?: string
  businessPhone?: string
  businessAddress?: string
}

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

/** Wraps a JPEG image into a single-page PDF 1.4 binary (no external dependencies). */
function buildPdfFromJpeg(jpegBytes: Uint8Array, pxW: number, pxH: number): Uint8Array {
  const pageW = 420
  const pageH = Math.round((pxH / pxW) * pageW * 100) / 100
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

  offsets.push(pos)
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')

  offsets.push(pos)
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  )

  offsets.push(pos)
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  )
  pushBytes(jpegBytes)
  pushStr('\nendstream\nendobj\n')

  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`
  offsets.push(pos)
  pushStr(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

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

/** Generates a real PDF File of the order receipt ready for sharing or downloading. */
export async function generateReceiptPdfFile(order: ReceiptOrder, biz: PdfBusiness): Promise<File> {
  const businessName = biz.businessName?.trim() || 'Raut Traders'
  const W = 840
  const padX = 48
  const innerW = W - padX * 2
  const font = "'Nunito', 'Noto Sans', system-ui, -apple-system, sans-serif"

  // Measure item rows first so canvas height fits any number of items
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  mctx.font = `700 24px ${font}`
  const itemRows = order.items.map((item) => {
    const nameLines = wrapText(mctx, item.name, 330)
    const meta = `${item.company}${item.size && item.size !== '0' ? ` · ${item.size}` : ''}`
    const rowH = Math.max(66, nameLines.length * 30 + (meta ? 34 : 16))
    return { item, nameLines, meta, rowH }
  })
  const itemsTotalH = itemRows.reduce((s, r) => s + r.rowH, 0)

  const headerH = 126
  const introH = 160
  const detailsH = 196
  const itemsHeaderH = 92
  const summaryH = 260
  const footerH = 160 + (biz.businessPhone ? 28 : 0) + (biz.businessAddress ? 28 : 0)
  const H = headerH + introH + detailsH + itemsHeaderH + itemsTotalH + summaryH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Brand header
  ctx.fillStyle = '#ef5350'
  ctx.fillRect(0, 0, W, headerH)

  const logo = await loadImage(logoUrl)
  let nameX = padX
  if (logo) {
    const lh = 56
    const lw = Math.round((logo.width / logo.height) * lh)
    // Draw white-tinted logo using offscreen canvas
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

  // RECEIPT pill
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  roundRectPath(ctx, W - padX - 134, 42, 134, 40, 20)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 20px ${font}`
  ctx.textAlign = 'center'
  ctx.fillText('RECEIPT', W - padX - 67, 69)
  ctx.textAlign = 'left'

  let y = headerH + 40

  // Confirmed badge
  ctx.fillStyle = '#e6f9f1'
  roundRectPath(ctx, padX, y, 168, 36, 18)
  ctx.fill()
  ctx.fillStyle = '#1baf7a'
  ctx.font = `700 19px ${font}`
  ctx.fillText('● CONFIRMED', padX + 18, y + 25)

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

  // Order details
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

  y += 34
  drawDivider(y)
  y += 38

  // Items table
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
  y += 16

  itemRows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(padX - 8, y, innerW + 16, row.rowH)
    }
    let ty = y + 30
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

    const midY = y + 32
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

    y += row.rowH
  })

  y += 22
  drawDivider(y)
  y += 38

  // Payment summary
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

  // Footer
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
  if (biz.businessAddress) {
    y += 28
    ctx.fillText(biz.businessAddress, W / 2, y)
  }

  // Bottom brand bar
  ctx.fillStyle = '#ef5350'
  ctx.fillRect(0, H - 18, W, 18)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const jpegBytes = base64ToBytes(dataUrl.split(',')[1])
  const pdfBytes = buildPdfFromJpeg(jpegBytes, W, H)
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  return new File([blob], `Receipt-${order.id}.pdf`, { type: 'application/pdf' })
}
