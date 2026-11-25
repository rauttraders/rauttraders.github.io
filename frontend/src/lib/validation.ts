// Checks made in the browser BEFORE anything is sent, so people get a clear message straight away.
// The server repeats every check and is the real authority (backend/src/lib/validate.ts) — this file must never accept
// something the server refuses. backend/tests/parity.test.mjs runs the same inputs through both and fails if they drift.
// Pure functions only (no imports) so the tests can load this file directly.

export const MAX_PRICE = 10_000_000
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024 // a photo straight from a phone camera is 2–8 MB
export const MAX_SOURCE_PIXELS = 64_000_000 // 64 megapixels
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 1_400_000 // the server accepts 1.5 MB; stay below it

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const BIDI = /[‪-‮⁦-⁩]/

export function validateText(value: string, max: number, label: string, required = false): string | null {
  const s = value.trim()
  if (required && !s) return `${label} is required.`
  if (s.length > max) return `${label} is too long (max ${max} characters).`
  if (CONTROL.test(s)) return `${label} contains invalid characters.`
  if (BIDI.test(s)) return `${label} contains hidden text-direction characters.`
  return null
}

/** A price in rupees. The shop requires more than 0; the server allows up to 10,000,000. */
export function validatePrice(value: number, label: string): string | null {
  if (!Number.isFinite(value) || value <= 0) return `${label} must be above 0.`
  if (value > MAX_PRICE) return `${label} cannot be more than ${MAX_PRICE.toLocaleString('en-IN')}.`
  return null
}

export function validateUsername(u: string): string | null {
  return /^[A-Za-z0-9._@-]{3,64}$/.test(u) ? null : 'The username must be 3–64 characters: letters, numbers and . _ @ - only.'
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', '12345678', '123456789', '1234567890', '11111111', '00000000',
  'qwerty123', 'qwertyuiop', 'iloveyou', 'letmein123', 'welcome1', 'welcome123', 'abc12345', 'abcd1234', 'admin123', 'admin1234', 'administrator',
  'changeme', 'changeme123', 'rauttraders', 'raut1234', 'rautraders',
])

export function validatePassword(pw: string, username = ''): string | null {
  if (pw.length < 8) return 'The new password must be at least 8 characters.'
  if (pw.length > 200) return 'The new password is too long (max 200 characters).'
  const lower = pw.toLowerCase()
  if (COMMON.has(lower)) return 'That password is too common. Choose something harder to guess.'
  if (/^(.)\1+$/.test(pw)) return 'A password made of one repeated character is too easy to guess.'
  if (/^\d+$/.test(pw)) return 'Add some letters. A password of only digits is too easy to guess.'
  if (username.length >= 3 && lower.includes(username.toLowerCase())) return 'The password must not contain the username.'
  if (lower.includes('admin') || lower.includes('password')) return 'The password must not contain "admin" or "password".'
  return null
}

export function validateEmail(e: string): string | null {
  if (!e) return null
  return e.length <= 200 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(e) ? null : 'That e-mail address does not look right.'
}

/** Pictures chosen from the computer/phone: only real raster formats, and not absurdly large (SVG can load outside content). */
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'])
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.has(file.type)) return 'Please choose a PNG, JPEG, WebP or GIF picture (SVG files are not allowed).'
  if (file.size > MAX_SOURCE_IMAGE_BYTES) return `That picture is too large (${(file.size / 1048576).toFixed(1)} MB). Choose one under ${MAX_SOURCE_IMAGE_BYTES / 1048576} MB.`
  return null
}

export function validateImagePixels(width: number, height: number): string | null {
  if (!(width > 0 && height > 0)) return 'That picture has no size and cannot be used.'
  if (width * height > MAX_SOURCE_PIXELS) return `That picture has too many pixels (${width} × ${height}). Choose a smaller one.`
  return null
}

export function validateBackupFile(file: { name: string; size: number }): string | null {
  if (!/\.json$/i.test(file.name)) return 'Choose a backup file (.json).'
  if (file.size > MAX_BACKUP_BYTES) return `That file is too large (${(file.size / 1048576).toFixed(1)} MB; the limit is ${MAX_BACKUP_BYTES / 1048576} MB).`
  return null
}

/** Size in bytes of the picture inside a `data:` URL. */
export const dataUrlBytes = (url: string): number => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4)
