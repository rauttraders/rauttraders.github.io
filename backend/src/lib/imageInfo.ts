/**
 * Reads the pixel size of a PNG / GIF / JPEG / WebP straight from its header (no decoding), so a tiny file that would
 * unpack into a gigantic picture ("pixel bomb") can be refused before it is stored. Returns null if it cannot be read.
 */
export interface Size { w: number; h: number }

const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1]
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8)
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
const tag = (b: Uint8Array, i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3])

function png(b: Uint8Array): Size | null {
  if (b.length < 24 || tag(b, 12) !== 'IHDR') return null
  return { w: u32be(b, 16), h: u32be(b, 20) }
}

function gif(b: Uint8Array): Size | null {
  return b.length < 10 ? null : { w: u16le(b, 6), h: u16le(b, 8) }
}

function jpeg(b: Uint8Array): Size | null {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue }
    const marker = b[i + 1]
    if (marker === 0xff) { i++; continue }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue } // markers without a length
    const len = u16be(b, i + 2)
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { h: u16be(b, i + 5), w: u16be(b, i + 7) }
    if (len < 2) return null
    i += 2 + len
  }
  return null
}

function webp(b: Uint8Array): Size | null {
  if (b.length < 30) return null
  const kind = tag(b, 12)
  if (kind === 'VP8X') return { w: 1 + u24le(b, 24), h: 1 + u24le(b, 27) }
  if (kind === 'VP8 ') return b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a ? { w: u16le(b, 26) & 0x3fff, h: u16le(b, 28) & 0x3fff } : null
  if (kind === 'VP8L') {
    if (b[20] !== 0x2f) return null
    return { w: 1 + (b[21] | ((b[22] & 0x3f) << 8)), h: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)) }
  }
  return null
}

export function imageSize(bytes: Uint8Array, mime: string): Size | null {
  if (mime === 'image/png') return png(bytes)
  if (mime === 'image/gif') return gif(bytes)
  if (mime === 'image/jpeg') return jpeg(bytes)
  if (mime === 'image/webp') return webp(bytes)
  return null
}

export const MAX_SIDE = 4096
export const MAX_PIXELS = 16_777_216 // 4096 × 4096
