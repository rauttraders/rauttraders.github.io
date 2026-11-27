import { Hono } from 'hono'
import {
  countUnread,
  deleteContact,
  hitContact,
  insertContact,
  listContacts,
  markRead,
  setArchived,
} from '../db/contacts'
import type { AppEnv } from '../env'
import { audit } from '../db/audit'
import { HttpError } from '../lib/http'
import { KB, maxBody } from '../middleware/limits'
import { clientIp, requireAdmin } from '../middleware/security'
import { sha256Hex } from '../lib/crypto'

// ── Public: submit a contact message ──────────────────────────────────────────
// 5 submissions per visitor per hour; 100 site-wide per hour.
const CONTACTS_PER_VISITOR_PER_HOUR = 5
const CONTACTS_SITE_WIDE_PER_HOUR = 100

export const publicContactRoutes = new Hono<AppEnv>()

publicContactRoutes.post('/contact', maxBody(8 * KB), async (c) => {
  if (!(c.req.header('Content-Type') ?? '').includes('application/json'))
    throw new HttpError(415, 'JSON required')

  const ip = clientIp(c)
  const ipKey = `contact:${(await sha256Hex(ip)).slice(0, 24)}`
  const siteKey = 'contact:all'

  if ((await hitContact(c.env.DB, ipKey, 3_600_000)) > CONTACTS_PER_VISITOR_PER_HOUR)
    throw new HttpError(429, 'Too many messages from this device. Please try again later.')
  if ((await hitContact(c.env.DB, siteKey, 3_600_000)) > CONTACTS_SITE_WIDE_PER_HOUR)
    throw new HttpError(429, 'We are receiving a lot of messages right now. Please try again shortly.')

  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Invalid JSON')

  const name = (typeof b.name === 'string' ? b.name.trim() : '').slice(0, 100)
  const shopName = (typeof b.shopName === 'string' ? b.shopName.trim() : '').slice(0, 100)
  const phone = (typeof b.phone === 'string' ? b.phone.trim() : '').slice(0, 30)
  const message = (typeof b.message === 'string' ? b.message.trim() : '').slice(0, 2000)

  if (!name) throw new HttpError(400, 'Name is required.')
  if (!phone) throw new HttpError(400, 'Phone number is required.')
  if (!/^[+\d\s\-().]{7,20}$/.test(phone)) throw new HttpError(400, 'Enter a valid phone number.')

  const msg = await insertContact(c.env.DB, { name, shopName, phone, message })
  return c.json({ ok: true, id: msg.id }, 201)
})

// ── Admin: manage inbox ────────────────────────────────────────────────────────
// Mounted under /api/admin — requireAdmin middleware is applied on the parent router
// for the whole /api/admin/* prefix, so every route here is already protected.

export const adminContactRoutes = new Hono<AppEnv>()
adminContactRoutes.use('*', requireAdmin)
adminContactRoutes.use('*', maxBody(8 * KB))

adminContactRoutes.get('/contacts', async (c) => {
  const archived = c.req.query('archived') === '1'
  const messages = await listContacts(c.env.DB, { archived })
  const unread = await countUnread(c.env.DB)
  return c.json({ messages, unread })
})

adminContactRoutes.get('/contacts/unread', async (c) => {
  const unread = await countUnread(c.env.DB)
  return c.json({ unread })
})

adminContactRoutes.post('/contacts/read', maxBody(2 * KB), async (c) => {
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const ids = Array.isArray(b?.ids)
    ? (b!.ids as unknown[]).filter((x) => typeof x === 'number').map(Number)
    : []
  if (!ids.length) throw new HttpError(400, 'Provide an array of message ids.')
  await markRead(c.env.DB, ids)
  return c.json({ ok: true })
})

adminContactRoutes.patch('/contacts/:id/archive', maxBody(1 * KB), async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid id')
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const archived = b?.archived !== false
  await setArchived(c.env.DB, id, archived)
  await audit(
    c.env.DB,
    c.get('admin').username,
    archived ? 'contact.archive' : 'contact.unarchive',
    String(id),
  )
  return c.json({ ok: true })
})

adminContactRoutes.delete('/contacts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid id')
  await deleteContact(c.env.DB, id)
  await audit(c.env.DB, c.get('admin').username, 'contact.delete', String(id))
  return c.json({ ok: true })
})
