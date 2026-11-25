import { Hono, type Context } from 'hono'
import { countAdmins, createAdmin, findAdminByUsername, setPasswordHash, updateAdminCredentials, updateAdminProfile } from '../../db/admins'
import { audit, recentAudit } from '../../db/audit'
import { assertNotLocked, clearAttempts, registerFailure } from '../../db/attempts'
import { readCatalogue, writeCatalogue } from '../../db/catalogue'
import { externalizeImages } from '../../db/images'
import { clearSampleOrders, deleteOrder, importOrders, listOrders, wipeOrders } from '../../db/orders'
import { createSession, endOtherSessions, endSession, SESSION_MS } from '../../db/sessions'
import type { AdminRow, AppEnv, Env } from '../../env'
import { cleanCatalogue, cleanImportOrders } from '../../lib/clean'
import { dummyHash, hashPassword, iterationsFrom, needsRehash, verifyPassword } from '../../lib/crypto'
import { HttpError, str } from '../../lib/http'
import { cleanImageRef, cleanText, emailProblem, passwordProblem, usernameProblem } from '../../lib/validate'
import { KB, MB, maxBody, rateLimit } from '../../middleware/limits'
import { assertOriginAllowed, bearerToken, clientIp, isLocalHost, requireAdmin } from '../../middleware/security'
import { publicCacheKey } from '../public'

export const adminRoutes = new Hono<AppEnv>()

/** The pepper is mandatory: refuse to hash or check passwords without it rather than silently weakening security. */
function pepperOf(env: Env): string {
  if (!env.PASSWORD_PEPPER || env.PASSWORD_PEPPER.length < 24) throw new HttpError(503, 'The server is not configured yet. Set the PASSWORD_PEPPER secret (at least 24 random characters).')
  return env.PASSWORD_PEPPER
}

const meBody = (a: AdminRow) => ({ user: a.username, profile: { name: a.name, email: a.email, photo: a.photo }, mustChange: !!a.must_change })

/** Reads a JSON object body; anything else (broken JSON, an array, null) is a clean 400. */
async function bodyOf(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  const b = await c.req.json().catch(() => null)
  if (typeof b !== 'object' || b === null || Array.isArray(b)) throw new HttpError(400, 'Invalid JSON')
  return b as Record<string, unknown>
}

const purgePublicCache = (c: Context<AppEnv>) => c.executionCtx.waitUntil(caches.default.delete(publicCacheKey(c.req.url)))

// ───────────── sign in (the only admin route that does not need a session) ─────────────
// Layers: Cloudflare rate limiter (10 tries/min per address) → body ≤ 8 KB → lock checks → password check.
adminRoutes.post('/login', rateLimit((e) => e.LOGIN_LIMITER), maxBody(8 * KB), async (c) => {
  if (!(c.req.header('Content-Type') ?? '').includes('application/json')) throw new HttpError(415, 'JSON required')
  assertOriginAllowed(c)

  const b = await bodyOf(c)
  const username = typeof b.user === 'string' ? b.user.trim().slice(0, 100) : ''
  const password = typeof b.pass === 'string' ? b.pass.slice(0, 200) : ''
  const db = c.env.DB
  const ip = clientIp(c)
  const who = username.toLowerCase()
  const keys = { visitorAccount: `ui:${who}|${ip}`, visitor: `ip:${ip}`, account: `user:${who}` }
  await assertNotLocked(db, Object.values(keys))
  const pepper = pepperOf(c.env)
  const iterations = iterationsFrom(c.env.PBKDF2_ITERATIONS)

  let admin: AdminRow | null = null
  if ((await countAdmins(db)) === 0) {
    // First ever sign-in: the account is created from the ADMIN_USER / ADMIN_PASSWORD secrets, and must change the password at once.
    if (!c.env.ADMIN_USER || !c.env.ADMIN_PASSWORD) throw new HttpError(503, 'The admin account has not been set up yet. Set the ADMIN_USER and ADMIN_PASSWORD secrets.')
    if (!isLocalHost(c.req.url)) {
      const weak = usernameProblem(c.env.ADMIN_USER) ?? passwordProblem(c.env.ADMIN_PASSWORD, c.env.ADMIN_USER) ?? (c.env.ADMIN_PASSWORD.length < 10 ? 'too short' : null)
      if (weak) throw new HttpError(503, 'The ADMIN_PASSWORD secret is too weak for a public site. Set a longer, harder one (10+ characters) and try again.')
    }
    if (username.toLowerCase() === c.env.ADMIN_USER.toLowerCase() && password === c.env.ADMIN_PASSWORD) {
      try {
        admin = await createAdmin(db, c.env.ADMIN_USER, await hashPassword(password, pepper, iterations), true)
      } catch {
        admin = await findAdminByUsername(db, username) // two first sign-ins at the same moment: the other one won
      }
    }
  } else {
    admin = await findAdminByUsername(db, username)
    const ok = await verifyPassword(password, admin?.password_hash ?? dummyHash(iterations), pepper) // same work whether or not the user exists
    if (admin && ok && needsRehash(admin.password_hash, iterations)) await setPasswordHash(db, admin.id, await hashPassword(password, pepper, iterations))
    if (!admin || !ok) admin = null
  }

  if (!admin) {
    const locked = await Promise.all([registerFailure(db, keys.visitorAccount, 5), registerFailure(db, keys.visitor, 20), registerFailure(db, keys.account, 30)])
    if (locked.some(Boolean)) await audit(db, who || '(blank)', 'login.locked')
    throw new HttpError(401, 'Incorrect username or password')
  }
  await clearAttempts(db, [keys.visitorAccount])
  const token = await createSession(db, admin.id)
  await audit(db, admin.username, 'login')
  // The token goes in the response body (never a cookie). The site keeps it for this browser tab and sends it back in a header.
  return c.json({ ...meBody(admin), token, expiresInSeconds: SESSION_MS / 1000 })
})

adminRoutes.use('*', requireAdmin)
adminRoutes.use('*', maxBody(25 * MB))
adminRoutes.use('/credentials', maxBody(8 * KB))
adminRoutes.use('/profile', maxBody(4 * MB))

// ───────────── account ─────────────
adminRoutes.get('/me', (c) => c.json(meBody(c.get('admin'))))

adminRoutes.post('/logout', async (c) => {
  const token = bearerToken(c)
  if (token) await endSession(c.env.DB, token)
  await audit(c.env.DB, c.get('admin').username, 'logout')
  return c.json({ ok: true })
})

adminRoutes.put('/profile', async (c) => {
  const b = await bodyOf(c)
  const email = cleanText(b.email, 200, 'E-mail')
  const problem = emailProblem(email)
  if (problem) throw new HttpError(400, problem)
  const [photo] = await externalizeImages(c.env.DB, [cleanImageRef(b.photo, 'Photo')])
  const name = str(b.name, 100) || 'Administrator'
  const updated = await updateAdminProfile(c.env.DB, c.get('admin').id, { name, email, photo })
  await audit(c.env.DB, c.get('admin').username, 'profile.update')
  return c.json(meBody(updated ?? c.get('admin')))
})

adminRoutes.post('/credentials', async (c) => {
  const admin = c.get('admin')
  const db = c.env.DB
  const b = await bodyOf(c)
  const key = `cred:${admin.id}`
  await assertNotLocked(db, [key])
  const pepper = pepperOf(c.env)
  const current = typeof b.currentPassword === 'string' ? b.currentPassword.slice(0, 200) : ''
  if (!(await verifyPassword(current, admin.password_hash, pepper))) {
    if (await registerFailure(db, key, 5)) await audit(db, admin.username, 'credentials.locked')
    throw new HttpError(403, 'Your current password is incorrect.')
  }
  const newUsername = typeof b.newUsername === 'string' && b.newUsername.trim() ? b.newUsername.trim() : admin.username
  const userProblem = usernameProblem(newUsername)
  if (userProblem) throw new HttpError(400, userProblem)
  let hash: string | null = null
  if (b.newPassword !== undefined && b.newPassword !== '') {
    if (typeof b.newPassword !== 'string') throw new HttpError(400, 'The new password must be text.')
    const problem = passwordProblem(b.newPassword, newUsername)
    if (problem) throw new HttpError(400, problem)
    hash = await hashPassword(b.newPassword, pepper, iterationsFrom(c.env.PBKDF2_ITERATIONS))
  } else if (admin.must_change) {
    throw new HttpError(400, 'Please choose a new password.')
  }
  let updated: AdminRow | null
  try {
    updated = await updateAdminCredentials(db, admin.id, newUsername, hash)
  } catch {
    throw new HttpError(409, 'That username is already taken.')
  }
  await clearAttempts(db, [key])
  if (hash) await endOtherSessions(db, admin.id, bearerToken(c) ?? '')
  await audit(db, newUsername, hash ? 'credentials.password' : 'credentials.username', hash ? 'other sessions signed out' : `was ${admin.username}`)
  return c.json(meBody(updated ?? admin))
})

adminRoutes.get('/audit', async (c) => c.json(await recentAudit(c.env.DB)))

// ───────────── catalogue (what the admin panel edits) ─────────────
adminRoutes.get('/state', async (c) => c.json(await readCatalogue(c.env.DB, false)))

adminRoutes.put('/state', async (c) => {
  const raw = await c.req.json().catch(() => null)
  // The page says which version of the shop data it started from; if someone saved in between, the save is refused (409).
  const sent = (raw as { version?: unknown } | null)?.version
  if (sent !== undefined && (typeof sent !== 'number' || !Number.isInteger(sent) || sent < 1)) throw new HttpError(400, 'Invalid version.')
  const catalogue = cleanCatalogue(raw)
  const refs = await externalizeImages(c.env.DB, [...catalogue.products.map((p) => p.image), ...catalogue.brands.map((b) => b.logo), ...catalogue.slides.map((s) => s.image)])
  let i = 0
  for (const p of catalogue.products) p.image = refs[i++]
  for (const b of catalogue.brands) b.logo = refs[i++]
  for (const s of catalogue.slides) s.image = refs[i++]
  const version = await writeCatalogue(c.env.DB, catalogue, sent as number | undefined)
  purgePublicCache(c)
  await audit(c.env.DB, c.get('admin').username, 'catalogue.save', `${catalogue.products.length} products`)
  // Uploaded pictures come back as /uploads/<id> links so the panel can swap them in, plus the new version number.
  return c.json({ products: catalogue.products, brands: catalogue.brands, slides: catalogue.slides, version })
})

// ───────────── orders (the ledger) ─────────────
adminRoutes.get('/orders', async (c) => c.json(await listOrders(c.env.DB)))

adminRoutes.post('/orders/sample', async (c) => {
  const b = await bodyOf(c)
  await importOrders(c.env.DB, cleanImportOrders(b.orders, 500).map((o) => ({ ...o, id: '', sample: true })))
  await audit(c.env.DB, c.get('admin').username, 'orders.sample.add')
  return c.json(await listOrders(c.env.DB))
})

adminRoutes.delete('/orders/sample', async (c) => {
  await clearSampleOrders(c.env.DB)
  await audit(c.env.DB, c.get('admin').username, 'orders.sample.clear')
  return c.json(await listOrders(c.env.DB))
})

// (must come after /orders/sample, otherwise "sample" would be read as an order number)
adminRoutes.delete('/orders/:id', async (c) => {
  const id = c.req.param('id')
  if (!/^RT-\d{1,9}$/.test(id)) throw new HttpError(404, 'Order not found')
  await deleteOrder(c.env.DB, id)
  await audit(c.env.DB, c.get('admin').username, 'order.delete', id)
  return c.json({ ok: true })
})

// ───────────── backup / restore ─────────────
adminRoutes.get('/backup', async (c) => {
  const [catalogue, orders] = await Promise.all([readCatalogue(c.env.DB, false), listOrders(c.env.DB, 100000)])
  await audit(c.env.DB, c.get('admin').username, 'backup.download', `${orders.length} orders`)
  return c.json({ app: 'raut-traders', exportedAt: new Date().toISOString(), products: catalogue.products, categories: catalogue.categories, brands: catalogue.brands, slides: catalogue.slides, settings: catalogue.settings, orders })
})

adminRoutes.post('/restore', async (c) => {
  const b = await bodyOf(c)
  if (b.app !== 'raut-traders') throw new HttpError(400, 'This file is not a backup from this site.')
  // Everything is checked BEFORE anything is changed, so a bad file cannot leave a half-restored shop.
  const catalogue = cleanCatalogue(b)
  const orders = cleanImportOrders(b.orders)
  const refs = await externalizeImages(c.env.DB, [...catalogue.products.map((p) => p.image), ...catalogue.brands.map((x) => x.logo), ...catalogue.slides.map((s) => s.image)])
  let i = 0
  for (const p of catalogue.products) p.image = refs[i++]
  for (const x of catalogue.brands) x.logo = refs[i++]
  for (const s of catalogue.slides) s.image = refs[i++]
  await writeCatalogue(c.env.DB, catalogue)
  if (Array.isArray(b.orders)) {
    await wipeOrders(c.env.DB) // a restore replaces the ledger with the backup's
    await importOrders(c.env.DB, orders)
  }
  purgePublicCache(c)
  await audit(c.env.DB, c.get('admin').username, 'backup.restore', `${catalogue.products.length} products, ${orders.length} orders`)
  return c.json({ ok: true })
})
