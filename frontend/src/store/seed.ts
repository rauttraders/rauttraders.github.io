import { uploadRef, uploadUrl } from '../lib/media'
import type { Order, OrderItem, Product } from './types'

// ── Utilities (not demo data) ─────────────────────────────────────────────────

/** Normalise a string to find a bundled company-logo file. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const companyLogoFiles = import.meta.glob('../assets/companies/*.png', { eager: true, import: 'default' }) as Record<string, string>
export const bundledCompanyLogos = Object.entries(companyLogoFiles).map(([path, src]) => ({
  name: (path.split('/').pop() ?? '').replace(/\.png$/, '').replace(/_/g, ' '),
  src,
}))
const logoByName = new Map(
  Object.entries(companyLogoFiles).map(([path, url]) => [norm((path.split('/').pop() ?? '').replace(/\.png$/, '')), url]),
)

/** Bundled logo for a brand name (if we ship one). Falls back to '' so callers can decide. */
export const seedLogoFor = (name: string): string => logoByName.get(norm(name)) ?? ''

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'item'

// ── Sample orders for the admin dashboard demo ────────────────────────────────

/** Small deterministic PRNG so the sample orders are stable between loads. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** ~45 days of demo orders so the dashboard charts have something to show. */
export function makeSampleOrders(products: Product[], days = 45): Order[] {
  if (products.length === 0) return []
  const rand = rng(7)
  const orders: Order[] = []
  let n = 1000
  for (let d = days - 1; d >= 0; d--) {
    const perDay = 1 + Math.floor(rand() * 3) + (d % 7 === 5 ? 1 : 0)
    for (let k = 0; k < perDay; k++) {
      const when = new Date()
      when.setDate(when.getDate() - d)
      when.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0)
      const lines = 1 + Math.floor(rand() * 3)
      const picked = new Set<number>()
      const items: OrderItem[] = []
      while (items.length < lines) {
        const i = Math.floor(rand() * products.length)
        if (picked.has(i)) continue
        picked.add(i)
        const p = products[i]
        items.push({ id: p.id, name: p.name, company: p.company, categoryId: p.categoryId, size: p.size, price: p.price, qty: 2 + Math.floor(rand() * 9) })
      }
      n++
      orders.push({
        id: `RT-${n}`,
        createdAt: when.toISOString(),
        items,
        total: items.reduce((s, i) => s + i.price * i.qty, 0),
        sample: true,
      })
    }
  }
  return orders
}

// ── Stable image keys for bundled assets ──────────────────────────────────────
//
// Vite gives bundled images a hashed filename that changes on every build.
// We store a stable "asset:" key in the DB and resolve it back to the current
// URL at runtime — so DB rows never need updating just because the build ran.
//
// Only slide and brand images that the admin might still reference need entries.
// Product images are always uploaded by the admin, so they go through uploadRef/uploadUrl.

const assetEntries: [string, string][] = [
  ...Object.entries(companyLogoFiles).map(([path, url]): [string, string] => {
    const file = (path.split('/').pop() ?? '').replace(/\.png$/, '')
    return [`asset:brand:${slugify(file)}`, url]
  }),
]
const assetByKey = new Map(assetEntries)
const keyByAsset = new Map(assetEntries.map(([k, v]) => [v, k]))

export const imageToStored = (url: string) => keyByAsset.get(url) ?? uploadRef(url)
export const imageFromStored = (v: string) => assetByKey.get(v) ?? uploadUrl(v)
