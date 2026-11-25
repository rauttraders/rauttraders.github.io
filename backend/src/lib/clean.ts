import type { BrandDTO, Catalogue, CategoryDTO, ProductDTO, SlideDTO } from '../db/catalogue'
import type { ImportOrder } from '../db/orders'
import { HttpError, num, str } from './http'
import { cleanId, cleanImageRef, cleanMoney, cleanText, ID_RE } from './validate'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A list with a hard maximum: too long is an error (413), never a silent cut that would lose data. */
function list(v: unknown, max: number, what: string): Obj[] {
  if (!Array.isArray(v)) throw new HttpError(400, `${what} must be a list.`)
  if (v.length > max) throw new HttpError(413, `Too many ${what} (maximum ${max}).`)
  return v.map((x) => {
    if (!isObj(x)) throw new HttpError(400, `Every entry in ${what} must be an object.`)
    return x
  })
}

function unique<T extends { id: string }>(items: T[], what: string): T[] {
  const seen = new Set<string>()
  for (const x of items) {
    if (seen.has(x.id)) throw new HttpError(400, `Duplicate ${what} id "${x.id}".`)
    seen.add(x.id)
  }
  return items
}

export const MAX_SETTINGS_BYTES = 200_000

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,40}$/

/** Types of the settings the website relies on ('s' text, 'n' number, 'b' true/false, 'a' list). Anything else is only checked generically. */
const KNOWN: Record<string, Record<string, 's' | 'n' | 'b' | 'a'>> = {
  business: { name: 's', tagline: 's', address: 's', phone: 's', email: 's', hours: 's', whatsappNumber: 's', lat: 'n', lng: 'n' },
  hero: { line1: 's', line2: 's', highlight: 's', description: 's', badges: 'a', primaryLabel: 's', secondaryLabel: 's' },
  shop: { title: 's', text: 's' },
  about: { title: 's', intro: 's', foundedYear: 'n', highlights: 'a' },
  contact: { title: 's', text: 's' },
  whatsapp: { intro: 's', showShopName: 'b', showAddress: 'b', showPhone: 'b', showHours: 'b', orderLabel: 's', showDate: 'b', itemStyle: 's', showCounts: 'b', showDiscount: 'b', totalLabel: 's', note: 's', closing: 's', divider: 's', emojis: 'b' },
}

/** Generic safety walk: limited depth/size, no prototype-pollution keys, finite numbers, short text without control or direction-override characters. */
function walk(v: unknown, depth: number, path: string): void {
  if (depth > 6) throw new HttpError(400, 'The site settings are nested too deeply.')
  if (v === null || typeof v === 'boolean') return
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new HttpError(400, `The setting "${path}" must be a normal number.`)
    return
  }
  if (typeof v === 'string') {
    if (v.length > 2000) throw new HttpError(400, `The setting "${path}" is too long (max 2000 characters).`)
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/.test(v)) throw new HttpError(400, `The setting "${path}" contains invalid characters.`)
    return
  }
  if (Array.isArray(v)) {
    if (v.length > 50) throw new HttpError(400, `The list "${path}" is too long (max 50 items).`)
    v.forEach((x, i) => walk(x, depth + 1, `${path}[${i}]`))
    return
  }
  if (isObj(v)) {
    const keys = Object.keys(v)
    if (keys.length > 60) throw new HttpError(400, `"${path}" has too many fields.`)
    for (const k of keys) {
      if (BAD_KEYS.has(k) || !KEY_RE.test(k)) throw new HttpError(400, `The setting name "${k}" is not allowed.`)
      walk(v[k], depth + 1, path ? `${path}.${k}` : k)
    }
    return
  }
  throw new HttpError(400, `The setting "${path}" has an unsupported type.`)
}

/** Validates the site-settings document (null/absent is fine). Known fields must have the right type; unknown ones just pass the generic checks. */
export function cleanSettings(v: unknown): unknown | null {
  if (v === undefined || v === null || !isObj(v)) return null
  if (JSON.stringify(v).length > MAX_SETTINGS_BYTES) throw new HttpError(413, 'The site settings are too large.')
  // The raw text may contain a "__proto__" key that JSON.parse made an own property; Object.keys sees it, so walk() refuses it.
  walk(v, 0, '')
  for (const [section, fields] of Object.entries(KNOWN)) {
    const sec = v[section]
    if (sec === undefined) continue
    if (!isObj(sec)) throw new HttpError(400, `The "${section}" settings must be a group of fields.`)
    for (const [field, type] of Object.entries(fields)) {
      const x = sec[field]
      if (x === undefined) continue
      if (x === null && section === 'business' && (field === 'lat' || field === 'lng')) {
        delete sec[field]
        continue
      }
      const ok = type === 's' ? typeof x === 'string' : type === 'n' ? typeof x === 'number' : type === 'b' ? typeof x === 'boolean' : Array.isArray(x)
      if (!ok) throw new HttpError(400, `The setting "${section}.${field}" has the wrong type.`)
    }
  }
  return v
}

/**
 * Validates a whole catalogue (from the admin panel or a backup file). Strict on purpose: anything wrong is a clear
 * 400/413 message rather than being quietly changed or dropped. Picture fields may still hold `data:image/…` uploads here.
 */
export function cleanCatalogue(b: unknown): Catalogue {
  if (!isObj(b)) throw new HttpError(400, 'Invalid catalogue data')
  const products: ProductDTO[] = unique(
    list(b.products, 1000, 'products').map((p) => {
      const mrp = p.mrp === undefined || p.mrp === null || p.mrp === 0 || p.mrp === '' ? undefined : cleanMoney(p.mrp, 'MRP')
      return {
        id: cleanId(p.id, 'product'),
        name: cleanText(p.name, 200, 'Product name', true),
        company: cleanText(p.company, 120, 'Brand'),
        categoryId: p.categoryId === '' || p.categoryId === undefined ? '' : cleanId(p.categoryId, 'category'),
        description: cleanText(p.description, 1000, 'Description'),
        size: cleanText(p.size, 60, 'Pack size'),
        price: cleanMoney(p.price, 'Price'),
        ...(mrp !== undefined ? { mrp } : {}),
        image: cleanImageRef(p.image, 'Product picture'),
        ...(p.isLogo === true ? { isLogo: true } : {}),
        active: p.active !== false,
      }
    }),
    'product',
  )
  const categories: CategoryDTO[] = unique(list(b.categories, 200, 'categories').map((c) => ({ id: cleanId(c.id, 'category'), name: cleanText(c.name, 120, 'Category name', true) })), 'category')
  const brands: BrandDTO[] = unique(list(b.brands ?? [], 500, 'brands').map((x) => ({ id: cleanId(x.id, 'brand'), name: cleanText(x.name, 120, 'Brand name', true), logo: cleanImageRef(x.logo, 'Brand logo') })), 'brand')
  const slides: SlideDTO[] = unique(
    list(b.slides ?? [], 20, 'slides').map((s) => {
      const scale = num(s.scale) || 1
      if (scale < 0.1 || scale > 5) throw new HttpError(400, 'Slide size must be between 0.1 and 5.')
      return { id: cleanId(s.id, 'slide'), title: cleanText(s.title, 200, 'Slide title'), image: cleanImageRef(s.image, 'Slide picture'), scale }
    }),
    'slide',
  )

  const settings = cleanSettings(b.settings)
  return { products, categories, brands, slides, settings }
}

export const MAX_RESTORE_ORDERS = 20_000
export const MAX_RESTORE_LINES = 60_000

/** Orders from a backup / demo data. Anything about the buyer (older backups have `customer`) is simply ignored. */
export function cleanImportOrders(v: unknown, maxOrders = MAX_RESTORE_ORDERS): ImportOrder[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new HttpError(400, 'Orders must be a list.')
  if (v.length > maxOrders) throw new HttpError(413, `Too many orders (maximum ${maxOrders.toLocaleString('en-IN')}).`)
  let lines = 0
  const out = v.filter(isObj).map((o) => {
    const id = str(o.id, 20)
    const when = Date.parse(str(o.createdAt, 40))
    const items = (Array.isArray(o.items) ? o.items.slice(0, 60).filter(isObj) : []).map((i) => ({
      id: str(i.id, 80), name: str(i.name, 200), company: str(i.company, 120), categoryId: str(i.categoryId, 80), size: str(i.size, 60),
      price: Math.min(10_000_000, Math.max(0, num(i.price))), qty: Math.min(999, Math.max(0, Math.floor(num(i.qty)))),
    })).filter((i) => ID_RE.test(i.id) && i.qty >= 1)
    lines += items.length
    return { id: /^RT-\d{1,9}$/.test(id) ? id : '', createdAt: Number.isNaN(when) ? new Date().toISOString() : new Date(when).toISOString(), sample: o.sample === true, items }
  }).filter((o) => o.items.length > 0)
  if (lines > MAX_RESTORE_LINES) throw new HttpError(413, `Too many order lines in one restore (maximum ${MAX_RESTORE_LINES.toLocaleString('en-IN')}).`)
  return out
}

/** Order lines from the public order form: [{ id, qty }], merged by product and bounded. Quantities must be whole numbers 1–999. */
export function cleanOrderLines(v: unknown): { id: string; qty: number }[] {
  if (!Array.isArray(v) || v.length === 0) throw new HttpError(400, 'Your basket is empty')
  if (v.length > 60) throw new HttpError(400, 'Too many different products in one order (maximum 60).')
  const merged = new Map<string, number>()
  for (const raw of v) {
    if (!isObj(raw)) throw new HttpError(400, 'Invalid order line.')
    const id = typeof raw.id === 'string' ? raw.id.trim() : ''
    if (!ID_RE.test(id)) throw new HttpError(400, 'Invalid product.')
    if (typeof raw.qty !== 'number' || !Number.isInteger(raw.qty) || raw.qty < 1 || raw.qty > 999) throw new HttpError(400, 'Quantities must be whole numbers from 1 to 999.')
    merged.set(id, Math.min(999, (merged.get(id) ?? 0) + raw.qty))
  }
  return [...merged].map(([id, qty]) => ({ id, qty }))
}
