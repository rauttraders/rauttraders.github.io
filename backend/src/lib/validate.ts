import { HttpError } from './http'

/** Ids (products, categories, brands, slides): letters, digits and . _ : - only. Keeps markup and SQL fragments out. */
export const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/

export function cleanId(v: unknown, what: string): string {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!ID_RE.test(s)) throw new HttpError(400, `Invalid ${what} id. Use letters, numbers and . _ : - only (max 80 characters).`)
  return s
}

export function cleanText(v: unknown, max: number, what: string, required = false): string {
  if (v !== undefined && v !== null && typeof v !== 'string') throw new HttpError(400, `${what} must be text.`)
  const s = ((v as string | undefined) ?? '').trim()
  if (s.length > max) throw new HttpError(400, `${what} is too long (max ${max} characters).`)
  if (required && !s) throw new HttpError(400, `${what} is required.`)
  // Control characters have no place in names or descriptions (tabs and new lines are fine in descriptions).
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)) throw new HttpError(400, `${what} contains invalid characters.`)
  // Right-to-left overrides and isolates can make text look like something else ("invoice\u202Eexe.txt"); refuse them.
  if (/[\u202A-\u202E\u2066-\u2069]/.test(s)) throw new HttpError(400, `${what} contains hidden text-direction characters.`)
  return s
}

export const MAX_MONEY = 10_000_000

/** A price in rupees: a finite number (or numeric text) between 0 and 10,000,000. */
export function cleanMoney(v: unknown, what: string): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) throw new HttpError(400, `${what} must be a number between 0 and ${MAX_MONEY.toLocaleString('en-IN')}.`)
  return Math.round(n * 100) / 100
}

const ASSET_REF = /^asset:[A-Za-z0-9._:/-]{1,120}$/
const UPLOAD_REF = /^\/uploads\/[0-9a-f]{64}$/
const BUNDLED_REF = /^\/assets\/[A-Za-z0-9._-]{1,120}$/

/**
 * Where a picture may come from: nothing, an upload stored in our database, a picture bundled with the site,
 * an http(s) link, or a fresh `data:image/…` upload (checked and stored by the image layer). Everything else
 * — `javascript:`, `data:text/html`, odd schemes — is refused.
 */
export function cleanImageRef(v: unknown, what = 'Picture'): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v !== 'string') throw new HttpError(400, `${what} must be a link or an uploaded picture.`)
  const s = v.trim()
  if (s.startsWith('data:image/')) return s
  if (s.length > 2000) throw new HttpError(400, `${what} link is too long.`)
  if (UPLOAD_REF.test(s) || ASSET_REF.test(s) || BUNDLED_REF.test(s)) return s
  try {
    const u = new URL(s)
    if (u.protocol === 'https:' || u.protocol === 'http:') return s
  } catch {
    /* falls through */
  }
  throw new HttpError(400, `${what} is not a valid picture link.`)
}

export function usernameProblem(u: string): string | null {
  return /^[A-Za-z0-9._@-]{3,64}$/.test(u) ? null : 'The username must be 3–64 characters: letters, numbers and . _ @ - only.'
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', '12345678', '123456789', '1234567890', '11111111', '00000000',
  'qwerty123', 'qwertyuiop', 'iloveyou', 'letmein123', 'welcome1', 'welcome123', 'abc12345', 'abcd1234', 'admin123', 'admin1234', 'administrator',
  'changeme', 'changeme123', 'rauttraders', 'raut1234', 'rautraders',
])

/** Returns why a password is not acceptable, or null when it is fine. */
export function passwordProblem(pw: string, username = ''): string | null {
  if (pw.length < 8) return 'The new password must be at least 8 characters.'
  if (pw.length > 200) return 'The new password is too long (max 200 characters).'
  const lower = pw.toLowerCase()
  if (COMMON.has(lower)) return 'That password is too common. Choose something harder to guess.'
  if (/^(.)\1+$/.test(pw)) return 'A password made of one repeated character is too easy to guess.'
  if (/^\d+$/.test(pw)) return 'Add some letters — a password of only digits is too easy to guess.'
  if (username.length >= 3 && lower.includes(username.toLowerCase())) return 'The password must not contain the username.'
  if (lower.includes('admin') || lower.includes('password')) return 'The password must not contain "admin" or "password".'
  return null
}

export function emailProblem(e: string): string | null {
  if (!e) return null
  return e.length <= 200 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(e) ? null : 'That e-mail address does not look right.'
}
