/** Image helpers for uploads: loading, and the "auto-fit" algorithm (remove a plain background, trim empty space). */
import { dataUrlBytes, MAX_UPLOAD_BYTES, validateImageFile, validateImagePixels } from '../lib/validation'

const validatePixelsOf = (img: HTMLImageElement) => validateImagePixels(img.naturalWidth, img.naturalHeight)

/**
 * Encodes the finished picture for upload and guarantees it is smaller than the server's limit: lowers the quality step by
 * step and, if that is not enough (e.g. a browser that can only make PNG), shrinks the picture a little each round.
 */
export function encodeUnderLimit(cv: HTMLCanvasElement, format: string): string {
  let canvas = cv
  for (let round = 0; round < 6; round++) {
    for (const quality of [0.9, 0.8, 0.7, 0.55, 0.4]) {
      const url = canvas.toDataURL(format, quality)
      if (dataUrlBytes(url) <= MAX_UPLOAD_BYTES) return url
    }
    const smaller = document.createElement('canvas')
    smaller.width = Math.max(1, Math.round(canvas.width * 0.8))
    smaller.height = Math.max(1, Math.round(canvas.height * 0.8))
    smaller.getContext('2d')?.drawImage(canvas, 0, 0, smaller.width, smaller.height)
    canvas = smaller
  }
  return canvas.toDataURL(format, 0.4)
}

export function loadImage(src: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const isFile = typeof src !== 'string'
    if (isFile) {
      const bad = validateImageFile(src) // right kind of file, and not enormous, BEFORE the browser tries to decode it
      if (bad) return reject(new Error(bad))
    }
    const url = isFile ? URL.createObjectURL(src) : src
    const img = new Image()
    if (!isFile && /^https?:/i.test(url)) img.crossOrigin = 'anonymous' // pictures from the API (another site) must be CORS-readable for the crop canvas
    img.onload = () => {
      if (isFile) URL.revokeObjectURL(url)
      const bad = validatePixelsOf(img)
      if (bad) return reject(new Error(bad))
      resolve(img)
    }
    img.onerror = () => {
      if (isFile) URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

const MAX_WORK = 1100

function toCanvas(img: HTMLImageElement, max = MAX_WORK): HTMLCanvasElement {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.naturalWidth * k))
  c.height = Math.max(1, Math.round(img.naturalHeight * k))
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
  return c
}

export interface AutoFitResult {
  canvas: HTMLCanvasElement
  /** A plain background was found and made transparent. */
  removedBackground: boolean
  /** Empty margins were cut away. */
  trimmed: boolean
}

/**
 * Auto-fit algorithm
 *  1. Work on a downscaled copy (fast).
 *  2. If the picture already has transparency, keep it. Otherwise look at the border: when it is one plain colour
 *     (a white studio background, a flat colour…), flood-fill that colour inwards *from the edges only*
 *     — so white parts inside the product are never removed — and make it transparent. A safety check undoes
 *     this if it would erase almost the whole picture.
 *  3. Find the bounding box of what is left and crop to it with a small margin, so the product is centred
 *     and its size no longer depends on how much empty space the photo had.
 */
export function autoFit(img: HTMLImageElement): AutoFitResult {
  const work = toCanvas(img)
  const { width: w, height: h } = work
  const ctx = work.getContext('2d', { willReadFrequently: true })!
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const n = w * h

  let semi = 0
  for (let i = 0; i < n; i++) if (px[i * 4 + 3] < 250) semi++
  const hasAlpha = semi / n > 0.005
  let removedBackground = false

  if (!hasAlpha) {
    // Mean colour of the 1px border.
    let r = 0, g = 0, b = 0, cnt = 0
    const edge = (x: number, y: number) => {
      const o = (y * w + x) * 4
      r += px[o]; g += px[o + 1]; b += px[o + 2]; cnt++
    }
    for (let x = 0; x < w; x++) { edge(x, 0); edge(x, h - 1) }
    for (let y = 1; y < h - 1; y++) { edge(0, y); edge(w - 1, y) }
    r /= cnt; g /= cnt; b /= cnt
    const dist = (o: number) => Math.hypot(px[o] - r, px[o + 1] - g, px[o + 2] - b)
    const TOL = 42

    let plain = 0
    const sample = (x: number, y: number) => { if (dist((y * w + x) * 4) <= TOL) plain++ }
    for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1) }
    for (let y = 1; y < h - 1; y++) { sample(0, y); sample(w - 1, y) }

    if (plain / cnt >= 0.85) {
      const seen = new Uint8Array(n)
      const queue = new Int32Array(n)
      let head = 0, tail = 0
      const push = (x: number, y: number) => {
        const i = y * w + x
        if (!seen[i] && dist(i * 4) <= TOL) { seen[i] = 1; queue[tail++] = i }
      }
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
      while (head < tail) {
        const i = queue[head++]
        const x = i % w, y = (i / w) | 0
        if (x > 0) push(x - 1, y)
        if (x < w - 1) push(x + 1, y)
        if (y > 0) push(x, y - 1)
        if (y < h - 1) push(x, y + 1)
      }
      if (tail / n < 0.93 && tail / n > 0.01) {
        // Soften the edge: pixels touching the background that are almost background-coloured are halo, drop them too.
        const halo: number[] = []
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x
            if (seen[i]) continue
            if ((seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w]) && dist(i * 4) <= TOL * 1.7) halo.push(i)
          }
        }
        for (let i = 0; i < n; i++) if (seen[i]) px[i * 4 + 3] = 0
        for (const i of halo) px[i * 4 + 3] = 0
        removedBackground = true
      }
    }
  }

  // Bounding box of the visible content.
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const out = document.createElement('canvas')
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  // Nothing found — or a background removal that left almost nothing (probably a bad guess): keep the original untouched.
  if (maxX < 0 || (!hasAlpha && (bw * bh) / n < 0.02)) {
    out.width = w; out.height = h
    out.getContext('2d')!.drawImage(work, 0, 0)
    return { canvas: out, removedBackground: false, trimmed: false }
  }
  ctx.putImageData(data, 0, 0)
  const pad = Math.round(Math.max(bw, bh) * 0.02)
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad)
  const x1 = Math.min(w, maxX + 1 + pad), y1 = Math.min(h, maxY + 1 + pad)
  out.width = x1 - x0
  out.height = y1 - y0
  out.getContext('2d')!.drawImage(work, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  const trimmed = out.width < w * 0.97 || out.height < h * 0.97
  return { canvas: out, removedBackground, trimmed }
}

export interface CropPreset {
  /** Dialog heading. */
  title: string
  aspects: { label: string; ratio: number; out: [number, number] }[]
  /** Remove plain background + trim by default. */
  autoFit: boolean
  /** Show a circular guide (profile photos). */
  circle?: boolean
  /** Colour behind the picture while editing (transparent parts show it). */
  stage: string
  /** Output format; PNG/WebP keep transparency. */
  format: 'image/webp' | 'image/jpeg'
  /** Fill colour for formats without transparency. */
  fill?: string
}

export const CROP_PRESETS: Record<'slide' | 'product' | 'logo' | 'avatar', CropPreset> = {
  slide: { title: 'Adjust slide image', aspects: [{ label: 'Slide', ratio: 8 / 5, out: [960, 600] }], autoFit: true, stage: '#fbd9d8', format: 'image/webp' },
  product: { title: 'Adjust product photo', aspects: [{ label: 'Square', ratio: 1, out: [640, 640] }, { label: 'Wide 4:3', ratio: 4 / 3, out: [800, 600] }], autoFit: true, stage: '#fff4f4', format: 'image/webp' },
  logo: { title: 'Adjust logo', aspects: [{ label: 'Wide 3:2', ratio: 3 / 2, out: [600, 400] }, { label: 'Square', ratio: 1, out: [480, 480] }], autoFit: true, stage: '#fff4f4', format: 'image/webp' },
  avatar: { title: 'Adjust profile photo', aspects: [{ label: 'Circle', ratio: 1, out: [320, 320] }], autoFit: false, circle: true, stage: '#ffffff', format: 'image/jpeg', fill: '#ffffff' },
}
