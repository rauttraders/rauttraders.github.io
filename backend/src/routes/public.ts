import { Hono } from 'hono'
import { readCatalogue, writeCatalogue } from '../db/catalogue'
import { externalizeImages, readImage } from '../db/images'
import { hit } from '../db/limits'
import { findIdempotent, placeOrder, type Idempotency } from '../db/orders'
import type { AppEnv } from '../env'
import { cleanCatalogue, cleanOrderLines } from '../lib/clean'
import { sha256Hex } from '../lib/crypto'
import { HttpError } from '../lib/http'
import { KB, MB, maxBody, rateLimit } from '../middleware/limits'
import { clientIp } from '../middleware/security'

export const publicRoutes = new Hono<AppEnv>()

publicRoutes.get('/health', (c) => c.json({ ok: true }))

/** The storefront's data. Cached at the edge for 30 s so a busy day costs one database read, not one per visitor. */
export const publicCacheKey = (url: string) => new Request(new URL('/api/public', url).toString(), { method: 'GET' })

publicRoutes.get('/public', async (c) => {
  const key = publicCacheKey(c.req.url)
  const cached = await caches.default.match(key)
  if (cached) return cached
  const catalogue = await readCatalogue(c.env.DB, true)
  const res = c.json(catalogue)
  if (!catalogue.seeded) return res // a brand-new, still empty shop must never be cached (it is about to be seeded)
  res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=30')
  c.executionCtx.waitUntil(caches.default.put(key, res.clone()))
  return res
})

const requireJson = (c: { req: { header: (n: string) => string | undefined } }) => {
  if (!(c.req.header('Content-Type') ?? '').includes('application/json')) throw new HttpError(415, 'JSON required')
}
const visitorKey = async (prefix: string, ip: string) => `${prefix}:${(await sha256Hex(ip)).slice(0, 24)}`

/** First visit of a brand-new deployment: the site pushes its sample catalogue so every device shares it. Only works once. */
publicRoutes.post('/bootstrap', maxBody(4 * MB), async (c) => {
  requireJson(c)
  const seeded = await c.env.DB.prepare("SELECT 1 AS x FROM meta WHERE key = 'seeded'").first()
  if (seeded) throw new HttpError(409, 'Already set up')
  if ((await hit(c.env.DB, await visitorKey('boot', clientIp(c)), 3600_000)) > 5) throw new HttpError(429, 'Too many requests. Please try again later.')
  const catalogue = cleanCatalogue(await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON') }))
  const refs = await externalizeImages(c.env.DB, [...catalogue.products.map((p) => p.image), ...catalogue.brands.map((b) => b.logo), ...catalogue.slides.map((s) => s.image)])
  let i = 0
  for (const p of catalogue.products) p.image = refs[i++]
  for (const b of catalogue.brands) b.logo = refs[i++]
  for (const s of catalogue.slides) s.image = refs[i++]
  await writeCatalogue(c.env.DB, catalogue)
  c.executionCtx.waitUntil(caches.default.delete(publicCacheKey(c.req.url)))
  return c.json({ ok: true })
})

/** Orders per visitor per hour, and across the whole site per hour (a botnet of many addresses cannot fill the database). */
const ORDERS_PER_VISITOR_PER_HOUR = 15
const ORDERS_SITE_WIDE_PER_HOUR = 300

/**
 * Place an order. The browser sends ONLY product ids and quantities; the server prices them from its own catalogue.
 * No name, phone or address is accepted or stored. The visitor's address is only ever stored as a one-way hash.
 */
publicRoutes.post('/orders', maxBody(32 * KB), async (c) => {
  requireJson(c)
  const body = (await c.req.json().catch(() => null)) as { items?: unknown } | null
  const lines = cleanOrderLines(body?.items)

  // Optional "Idempotency-Key": the browser makes one per order and re-sends the same one on a retry, so a double tap or a
  // flaky connection can never create two orders. The same key with a different basket is refused.
  let idem: Idempotency | undefined
  const rawKey = c.req.header('Idempotency-Key')
  if (rawKey !== undefined) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(rawKey)) throw new HttpError(400, 'Invalid Idempotency-Key (8–64 letters, numbers, - or _).')
    const fingerprint = await sha256Hex([...lines].sort((a, b) => a.id.localeCompare(b.id)).map((l) => `${l.id}:${l.qty}`).join('|'))
    idem = { key: rawKey, fingerprint }
    const prior = await findIdempotent(c.env.DB, rawKey)
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new HttpError(422, 'That order key was already used for a different order.')
      c.header('Idempotent-Replayed', 'true')
      return c.json({ id: prior.id, total: prior.total, createdAt: prior.createdAt }, 200)
    }
  }

  if ((await hit(c.env.DB, await visitorKey('order', clientIp(c)), 3600_000)) > ORDERS_PER_VISITOR_PER_HOUR) throw new HttpError(429, 'Too many orders from this device. Please try again later.')
  if ((await hit(c.env.DB, 'order:all', 3600_000)) > ORDERS_SITE_WIDE_PER_HOUR) throw new HttpError(429, 'We are receiving a lot of orders right now. Please try again in a little while, or message us on WhatsApp.')
  const placed = await placeOrder(c.env.DB, lines, idem)
  if (placed.replayed) {
    if (idem && placed.replayed.fingerprint !== idem.fingerprint) throw new HttpError(422, 'That order key was already used for a different order.')
    c.header('Idempotent-Replayed', 'true')
    return c.json({ id: placed.id, total: placed.total, createdAt: placed.createdAt }, 200)
  }
  return c.json({ id: placed.id, total: placed.total, createdAt: placed.createdAt }, 201)
})

/** Images stored in the database. Immutable (the id is the SHA-256 of the bytes), so browsers and the edge cache them forever. */
export const uploadsRoutes = new Hono<AppEnv>()
uploadsRoutes.get('/:file', rateLimit((e) => e.UPLOADS_LIMITER), async (c) => {
  const cached = await caches.default.match(c.req.raw)
  if (cached) return cached
  const img = await readImage(c.env.DB, c.req.param('file').split('.')[0])
  if (!img) throw new HttpError(404, 'Not found')
  const res = new Response(img.bytes, {
    headers: {
      'Content-Type': img.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
  c.executionCtx.waitUntil(caches.default.put(c.req.raw, res.clone()))
  return res
})
