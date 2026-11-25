import { sha256Hex } from '../lib/crypto'
import { HttpError } from '../lib/http'
import { imageSize, MAX_PIXELS, MAX_SIDE } from '../lib/imageInfo'

/** Images live in the database (table `images`, BLOB). D1 caps a row at ~2 MB, so uploads are limited to 1.5 MB. */
export const MAX_IMAGE_BYTES = 1_500_000
const MAX_NEW_IMAGES_PER_SAVE = 40
const DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/
const MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }

const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0))

/** The first bytes of a real PNG / JPEG / WebP / GIF — so a text file renamed to ".png" is not accepted as a picture. */
function looksLikeImage(b: Uint8Array, mime: string): boolean {
  const at = (i: number) => b[i]
  if (mime === 'image/png') return at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47
  if (mime === 'image/jpeg') return at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff
  if (mime === 'image/gif') return at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38
  if (mime === 'image/webp') return at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  return false
}

/**
 * Takes the image fields of a save request. Any `data:image/…` value is checked and stored in the `images` table and
 * replaced by "/uploads/<id>"; everything else (existing /uploads refs, bundled "asset:…" keys, URLs) is passed through
 * (it was already validated by cleanImageRef). A corrupt or unsupported upload is an error, never silently dropped.
 */
export async function externalizeImages(db: D1Database, values: string[]): Promise<string[]> {
  const stmts = new Map<string, D1PreparedStatement>()
  const out: string[] = []
  for (const v of values) {
    if (!v.startsWith('data:image/')) {
      out.push(v)
      continue
    }
    const m = DATA_URL.exec(v)
    if (!m) throw new HttpError(400, 'A picture is in an unsupported format. Use PNG, JPEG, WebP or GIF (SVG is not allowed).')
    let bytes: Uint8Array
    try {
      bytes = unb64(m[2])
    } catch {
      throw new HttpError(400, 'A picture is corrupt. Please choose it again.')
    }
    if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'An image is too large (limit 1.5 MB). Choose a smaller picture or crop it.')
    const mime = MIME[m[1]]
    if (!looksLikeImage(bytes, mime)) throw new HttpError(400, 'A file is not a real picture of the type it claims to be.')
    const size = imageSize(bytes, mime)
    if (!size || size.w < 1 || size.h < 1) throw new HttpError(400, 'A picture could not be read (its size is missing or broken). Please choose it again.')
    if (size.w > MAX_SIDE || size.h > MAX_SIDE || size.w * size.h > MAX_PIXELS) throw new HttpError(400, `A picture has too many pixels (${size.w} × ${size.h}). The limit is ${MAX_SIDE} × ${MAX_SIDE}.`)
    const id = await sha256Hex(bytes)
    if (!stmts.has(id)) {
      stmts.set(id, db.prepare('INSERT OR IGNORE INTO images (id, mime, bytes, size) VALUES (?1, ?2, ?3, ?4)').bind(id, mime, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), bytes.length))
    }
    out.push(`/uploads/${id}`)
  }
  if (stmts.size > MAX_NEW_IMAGES_PER_SAVE) throw new HttpError(413, 'Too many new images in one save. Save in smaller steps.')
  if (stmts.size) await db.batch([...stmts.values()])
  return out
}

export async function readImage(db: D1Database, id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!/^[0-9a-f]{64}$/.test(id)) return null
  const r = await db.prepare('SELECT mime, bytes FROM images WHERE id = ?1').bind(id).first<{ mime: string; bytes: ArrayBuffer | number[] }>()
  if (!r) return null
  return { mime: r.mime, bytes: Array.isArray(r.bytes) ? new Uint8Array(r.bytes) : new Uint8Array(r.bytes) }
}

/** Removes stored images that nothing refers to any more (older than a day, so a save in progress is safe). */
export async function purgeUnusedImages(db: D1Database): Promise<void> {
  await db
    .prepare(
      `DELETE FROM images WHERE created_at < datetime('now', '-1 day') AND ('/uploads/' || id) NOT IN (
         SELECT image FROM products UNION SELECT logo FROM brands UNION SELECT image FROM slides UNION SELECT photo FROM admins)`,
    )
    .run()
}
