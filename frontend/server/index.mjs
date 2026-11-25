// Raut Trader's — free, zero-dependency server (Node 18+).
// Serves the built website AND the API, and keeps all shared data (catalogue, orders, admin login)
// in one JSON file, so every device (customer phones, the shop's admin PC) sees the same data.
//
//   npm run build && node server/index.mjs        ->  http://localhost:3001
//
// Environment (all optional):
//   PORT=3001   DATA_DIR=./server/data   ADMIN_USER=admin   ADMIN_PASSWORD=<your-password>   SECURE_COOKIES=1 (when behind https)
//
// SECURITY: If ADMIN_PASSWORD is not set, a random one-time password is printed to the console on first start.
//           You MUST change it immediately in Admin → My account → Change password.
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(HERE, 'data'))
const UPLOADS = path.join(DATA_DIR, 'uploads')
const DIST = path.join(HERE, '..', 'dist')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const SECURE = process.env.SECURE_COOKIES === '1'
const SESSION_MS = 7 * 24 * 3600 * 1000
const STATUSES = ['new', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

fs.mkdirSync(UPLOADS, { recursive: true })

// ---------------------------------------------------------------- database (one JSON file, atomic writes)
const hashPassword = (pass, salt = crypto.randomBytes(16).toString('base64')) => ({
  salt,
  hash: crypto.scryptSync(pass, Buffer.from(salt, 'base64'), 64).toString('base64'),
})
const checkPassword = (pass, rec) => {
  const a = crypto.scryptSync(pass, Buffer.from(rec.salt, 'base64'), 64)
  const b = Buffer.from(rec.hash, 'base64')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function freshDb() {
  const user = process.env.ADMIN_USER || 'admin'
  const hasEnvPass = !!process.env.ADMIN_PASSWORD
  // Never fall back to a hardcoded password. If none is set via env, generate a secure random one
  // and print it once so the operator can log in and change it immediately.
  const pass = hasEnvPass
    ? process.env.ADMIN_PASSWORD
    : crypto.randomBytes(9).toString('base64url') // ~12 printable chars, URL-safe
  if (!hasEnvPass) {
    console.log('\n╔══════════════════════════════════════════════════╗')
    console.log('║           ADMIN FIRST-RUN CREDENTIALS           ║')
    console.log('║                                                  ║')
    console.log(`║  Username : ${user.padEnd(37)}║`)
    console.log(`║  Password : ${pass.padEnd(37)}║`)
    console.log('║                                                  ║')
    console.log('║  ⚠  Change this password before going live!  ⚠  ║')
    console.log('║  Admin → My account → Change password            ║')
    console.log('╚══════════════════════════════════════════════════╝\n')
  }
  return {
    v: 1,
    seeded: false,
    products: [],
    categories: [],
    brands: [],
    slides: [],
    settings: null,
    orders: [],
    nextOrder: 1001,
    // mustChange is true whenever no explicit ADMIN_PASSWORD env var was provided
    admin: { user, ...hashPassword(pass), mustChange: !hasEnvPass, profile: { name: 'Administrator', email: '', photo: '' } },
    sessions: {},
    customers: [],
    csessions: {},
    contacts: [],       // contact messages from the website form
    nextContact: 1,     // auto-increment id counter
  }
}

let db
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
} catch {
  db = freshDb()
}
db.customers ??= []
db.csessions ??= {}
db.contacts ??= []
db.nextContact ??= 1
let lastBackupDay = ''
let saveTimer = null
function saveNow() {
  saveTimer = null
  const tmp = `${DB_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db))
  fs.renameSync(tmp, DB_FILE)
  // One safety copy per day, keep the last 14.
  const day = new Date().toISOString().slice(0, 10)
  if (day !== lastBackupDay) {
    lastBackupDay = day
    try {
      fs.copyFileSync(DB_FILE, path.join(DATA_DIR, `backup-${day}.json`))
      const old = fs.readdirSync(DATA_DIR).filter((f) => /^backup-.*\.json$/.test(f)).sort().slice(0, -14)
      old.forEach((f) => fs.unlinkSync(path.join(DATA_DIR, f)))
    } catch {
      /* backups are best-effort */
    }
  }
}
const save = () => {
  if (!saveTimer) saveTimer = setTimeout(saveNow, 80)
}
if (!fs.existsSync(DB_FILE)) saveNow()
process.on('SIGINT', () => { if (saveTimer) saveNow(); process.exit(0) })
process.on('SIGTERM', () => { if (saveTimer) saveNow(); process.exit(0) })

// ---------------------------------------------------------------- helpers
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' }

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new HttpError(413, 'Request too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new HttpError(400, 'Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

const send = (res, status, body, headers = {}) => {
  const data = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(data)
}

const cookie = (req, name) => (req.headers.cookie || '').split(';').map((s) => s.trim().split('=')).find(([k]) => k === name)?.[1]
const ip = (req) => req.socket.remoteAddress || 'x'

// Simple in-memory rate limiter: `max` hits per `windowMs` per key.
const hits = new Map()
function limit(key, max, windowMs) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) throw new HttpError(429, 'Too many requests. Please try again later.')
  arr.push(now)
  hits.set(key, arr)
}

// Replace data:image/... URLs with files in uploads/ so the JSON stays small and images cache well.
function externalize(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return value
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(value)
  if (!m) return ''
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 6 * 1024 * 1024) throw new HttpError(413, 'Image too large')
  const name = `${crypto.createHash('sha1').update(buf).digest('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
  const file = path.join(UPLOADS, name)
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf)
  return `/uploads/${name}`
}

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function cleanState(b) {
  if (!b || !Array.isArray(b.products) || !Array.isArray(b.categories)) throw new HttpError(400, 'Invalid catalogue data')
  return {
    products: b.products.slice(0, 2000).map((p) => ({
      id: str(p.id, 80), name: str(p.name, 200), company: str(p.company, 120), categoryId: str(p.categoryId, 80),
      description: str(p.description, 1000), size: str(p.size, 60), price: Math.max(0, num(p.price)),
      ...(p.mrp ? { mrp: Math.max(0, num(p.mrp)) } : {}), image: externalize(str(p.image, 9_000_000)),
      ...(p.isLogo ? { isLogo: true } : {}), active: p.active !== false,
    })).filter((p) => p.id && p.name),
    categories: b.categories.slice(0, 200).map((c) => ({ id: str(c.id, 80), name: str(c.name, 120) })).filter((c) => c.id && c.name),
    brands: (Array.isArray(b.brands) ? b.brands : []).slice(0, 500).map((x) => ({ id: str(x.id, 80), name: str(x.name, 120), logo: externalize(str(x.logo, 9_000_000)) })).filter((x) => x.id && x.name),
    slides: (Array.isArray(b.slides) ? b.slides : []).slice(0, 20).map((s) => ({ id: str(s.id, 80), title: str(s.title, 200), image: externalize(str(s.image, 9_000_000)), scale: num(s.scale) || 1 })).filter((s) => s.id),
    settings: b.settings && typeof b.settings === 'object' ? b.settings : null,
  }
}

const publicOrder = (o) => ({ id: o.id, createdAt: o.createdAt, status: o.status, total: o.total, items: o.items, history: o.history, cancelledBy: o.cancelledBy ?? null, customer: { name: o.customer.name, shopName: o.customer.shopName } })
const adminOrder = ({ token, customerId, ...o }) => ({ ...o, registered: !!customerId }) // eslint-disable-line no-unused-vars

function pushStatus(o, status, by) {
  o.status = status
  o.history.push({ status, at: new Date().toISOString(), by })
  if (status === 'cancelled') o.cancelledBy = by
  else delete o.cancelledBy
}

// ---------------------------------------------------------------- auth
function session(req) {
  const id = cookie(req, 'rt_sid')
  const s = id && db.sessions[id]
  if (!s) return null
  if (s.exp < Date.now()) {
    delete db.sessions[id]
    return null
  }
  return { id, ...s }
}
function requireAdmin(req) {
  const s = session(req)
  if (!s) throw new HttpError(401, 'Please sign in')
  if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'JSON required')
  return s
}
const sessionCookie = (id, maxAge) => `rt_sid=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`
const meBody = () => ({ user: db.admin.user, profile: db.admin.profile, mustChange: !!db.admin.mustChange })

// ---------------------------------------------------------------- customer accounts (optional — guests can always order)
const CUSTOMER_SESSION_MS = 30 * 24 * 3600 * 1000
const digits10 = (v) => String(v ?? '').replace(/\D/g, '').slice(-10)
const emailKey = (v) => str(v, 200).toLowerCase()
const customerCookie = (id, maxAge) => `rt_cid=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`
function customerSession(req) {
  const id = cookie(req, 'rt_cid')
  const s = id && db.csessions[id]
  if (!s) return null
  if (s.exp < Date.now()) {
    delete db.csessions[id]
    return null
  }
  const c = db.customers.find((x) => x.id === s.cid)
  return c ? { id, customer: c } : null
}
function requireCustomer(req) {
  const s = customerSession(req)
  if (!s) throw new HttpError(401, 'Please sign in')
  if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'JSON required')
  return s
}
const customerBody = (c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, shopName: c.shopName, address: c.address })
function startCustomerSession(c) {
  const id = crypto.randomBytes(32).toString('hex')
  db.csessions[id] = { cid: c.id, exp: Date.now() + CUSTOMER_SESSION_MS }
  for (const k of Object.keys(db.csessions)) if (db.csessions[k].exp < Date.now()) delete db.csessions[k]
  return id
}

// ---------------------------------------------------------------- routes
async function api(req, res, url) {
  const p = url.pathname
  const m = req.method

  if (p === '/api/health') return send(res, 200, { ok: true })

  // ---- public catalogue
  if (p === '/api/public' && m === 'GET') {
    return send(res, 200, { seeded: db.seeded, products: db.products.filter((x) => x.active), categories: db.categories, brands: db.brands, slides: db.slides, settings: db.settings })
  }
  if (p === '/api/bootstrap' && m === 'POST') {
    if (db.seeded) throw new HttpError(409, 'Already set up')
    limit(`boot:${ip(req)}`, 5, 3600_000)
    Object.assign(db, cleanState(await readBody(req)), { seeded: true })
    save()
    return send(res, 200, { ok: true })
  }

  // ---- customers: place / track / cancel an order
  if (p === '/api/orders' && m === 'POST') {
    limit(`order:${ip(req)}`, 15, 3600_000)
    const b = await readBody(req)
    const c = b.customer || {}
    const customer = { name: str(c.name, 100), shopName: str(c.shopName, 120), phone: str(c.phone, 30), address: str(c.address, 400) }
    // Customer details are all optional — shops are busy, so an order with no details is still a valid order.
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 60) throw new HttpError(400, 'Your basket is empty')
    const items = []
    for (const it of b.items) {
      const prod = db.products.find((x) => x.id === it.id && x.active)
      const qty = Math.floor(num(it.qty))
      if (!prod) throw new HttpError(409, 'A product in your basket is no longer available. Please refresh and try again.')
      if (qty < 1 || qty > 999) throw new HttpError(400, 'Invalid quantity')
      // Prices always come from the server catalogue, never from the browser.
      items.push({ id: prod.id, name: prod.name, company: prod.company, categoryId: prod.categoryId, size: prod.size, price: prod.price, qty })
    }
    const now = new Date().toISOString()
    const order = {
      id: `RT-${db.nextOrder++}`, createdAt: now, customer, items,
      total: items.reduce((s, i) => s + i.price * i.qty, 0), status: 'new',
      history: [{ status: 'new', at: now, by: 'customer' }], token: crypto.randomBytes(12).toString('hex'),
      ...(customerSession(req) ? { customerId: customerSession(req).customer.id } : {}),
    }
    db.orders.unshift(order)
    save()
    return send(res, 201, { ...publicOrder(order), token: order.token })
  }
  const om = /^\/api\/orders\/(RT-\d+)(\/cancel)?$/.exec(p)
  if (om) {
    const o = db.orders.find((x) => x.id === om[1])
    const token = str(url.searchParams.get('token') || '', 80)
    const body = m === 'POST' ? await readBody(req) : {}
    const given = token || str(body.token, 80)
    if (!o || !given || given.length !== o.token.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(o.token))) throw new HttpError(404, 'Order not found')
    if (!om[2] && m === 'GET') return send(res, 200, publicOrder(o))
    if (om[2] && m === 'POST') {
      if (!['new', 'confirmed'].includes(o.status)) throw new HttpError(409, o.status === 'cancelled' ? 'This order is already cancelled.' : 'This order is already on its way and can no longer be cancelled. Please contact the shop.')
      pushStatus(o, 'cancelled', 'customer')
      save()
      return send(res, 200, publicOrder(o))
    }
  }

  // ---- customer accounts
  if (p === '/api/customer/register' && m === 'POST') {
    limit(`creg:${ip(req)}`, 10, 3600_000)
    const b = await readBody(req)
    const name = str(b.name, 100)
    const phone = str(b.phone, 30)
    const email = emailKey(b.email)
    const password = String(b.password ?? '')
    if (name.length < 2) throw new HttpError(400, 'Please enter your name.')
    if (digits10(phone).length < 10) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.')
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'That email address does not look right.')
    if (password.length < 6) throw new HttpError(400, 'Your password must be at least 6 characters.')
    if (db.customers.some((c) => digits10(c.phone) === digits10(phone))) throw new HttpError(409, 'An account with this mobile number already exists. Try signing in.')
    if (email && db.customers.some((c) => c.email && c.email === email)) throw new HttpError(409, 'An account with this email already exists. Try signing in.')
    const c = { id: `C-${crypto.randomBytes(5).toString('hex')}`, name, phone, email, shopName: str(b.shopName, 120), address: str(b.address, 400), createdAt: new Date().toISOString(), ...hashPassword(password) }
    db.customers.push(c)
    const sid = startCustomerSession(c)
    save()
    return send(res, 201, customerBody(c), { 'Set-Cookie': customerCookie(sid, CUSTOMER_SESSION_MS / 1000) })
  }
  if (p === '/api/customer/login' && m === 'POST') {
    limit(`clogin:${ip(req)}`, 12, 15 * 60_000)
    const b = await readBody(req)
    const idf = str(b.id, 200)
    const byEmail = idf.includes('@') ? idf.toLowerCase() : ''
    const c = db.customers.find((x) => (byEmail ? x.email === byEmail : digits10(x.phone) === digits10(idf) && digits10(idf).length === 10))
    if (!c || !checkPassword(String(b.password ?? ''), c)) throw new HttpError(401, 'Incorrect mobile number / email or password.')
    const sid = startCustomerSession(c)
    save()
    return send(res, 200, customerBody(c), { 'Set-Cookie': customerCookie(sid, CUSTOMER_SESSION_MS / 1000) })
  }
  if (p === '/api/customer/me' && m === 'GET') {
    const s = customerSession(req)
    if (!s) throw new HttpError(401, 'Not signed in')
    return send(res, 200, customerBody(s.customer))
  }
  if (p.startsWith('/api/customer/')) {
    const s = requireCustomer(req)
    const c = s.customer
    if (p === '/api/customer/logout' && m === 'POST') {
      delete db.csessions[s.id]
      save()
      return send(res, 200, { ok: true }, { 'Set-Cookie': customerCookie('', 0) })
    }
    if (p === '/api/customer/profile' && m === 'PUT') {
      const b = await readBody(req)
      const name = str(b.name, 100)
      const phone = str(b.phone, 30)
      const email = emailKey(b.email)
      if (name.length < 2) throw new HttpError(400, 'Please enter your name.')
      if (digits10(phone).length < 10) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.')
      if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'That email address does not look right.')
      if (db.customers.some((x) => x.id !== c.id && digits10(x.phone) === digits10(phone))) throw new HttpError(409, 'Another account already uses this mobile number.')
      if (email && db.customers.some((x) => x.id !== c.id && x.email === email)) throw new HttpError(409, 'Another account already uses this email.')
      Object.assign(c, { name, phone, email, shopName: str(b.shopName, 120), address: str(b.address, 400) })
      save()
      return send(res, 200, customerBody(c))
    }
    if (p === '/api/customer/password' && m === 'POST') {
      limit(`cpw:${ip(req)}`, 10, 15 * 60_000)
      const b = await readBody(req)
      if (!checkPassword(String(b.currentPassword ?? ''), c)) throw new HttpError(403, 'Your current password is incorrect.')
      if (String(b.newPassword ?? '').length < 6) throw new HttpError(400, 'Your new password must be at least 6 characters.')
      Object.assign(c, hashPassword(String(b.newPassword)))
      save()
      return send(res, 200, { ok: true })
    }
    if (p === '/api/customer/orders' && m === 'GET') {
      return send(res, 200, db.orders.filter((o) => o.customerId === c.id).slice(0, 100).map((o) => ({ ...publicOrder(o), token: o.token })))
    }
    // Attach orders this device placed as a guest to the account (needs each order's secret token).
    if (p === '/api/customer/claim' && m === 'POST') {
      const b = await readBody(req)
      let n = 0
      for (const r of (Array.isArray(b.orders) ? b.orders : []).slice(0, 50)) {
        const o = db.orders.find((x) => x.id === r.id)
        if (o && !o.customerId && typeof r.token === 'string' && r.token.length === o.token.length && crypto.timingSafeEqual(Buffer.from(r.token), Buffer.from(o.token))) {
          o.customerId = c.id
          n++
        }
      }
      if (n) save()
      return send(res, 200, { claimed: n })
    }
    throw new HttpError(404, 'Not found')
  }

  // ---- public: contact form submission
  if (p === '/api/contact' && m === 'POST') {
    limit(`contact:${ip(req)}`, 5, 3_600_000)
    const b = await readBody(req)
    const name = str(b.name, 100)
    const phone = str(b.phone, 30)
    if (!name) throw new HttpError(400, 'Name is required.')
    if (!phone) throw new HttpError(400, 'Phone number is required.')
    if (!/^[+\d\s\-().]{7,20}$/.test(phone)) throw new HttpError(400, 'Enter a valid phone number.')
    const msg = {
      id: db.nextContact++,
      createdAt: new Date().toISOString(),
      name,
      shopName: str(b.shopName, 100),
      phone,
      message: str(b.message, 2000),
      read: false,
      archived: false,
    }
    db.contacts.unshift(msg)
    save()
    return send(res, 201, { ok: true, id: msg.id })
  }

  // ---- admin session
  if (p === '/api/admin/login' && m === 'POST') {    limit(`login:${ip(req)}`, 10, 15 * 60_000)
    const b = await readBody(req)
    if (str(b.user, 100) !== db.admin.user || !checkPassword(String(b.pass ?? ''), db.admin)) throw new HttpError(401, 'Incorrect username or password')
    const id = crypto.randomBytes(32).toString('hex')
    db.sessions[id] = { exp: Date.now() + SESSION_MS }
    for (const k of Object.keys(db.sessions)) if (db.sessions[k].exp < Date.now()) delete db.sessions[k]
    save()
    return send(res, 200, meBody(), { 'Set-Cookie': sessionCookie(id, SESSION_MS / 1000) })
  }
  if (p === '/api/admin/me' && m === 'GET') {
    if (!session(req)) throw new HttpError(401, 'Not signed in')
    return send(res, 200, meBody())
  }

  if (!p.startsWith('/api/admin/')) throw new HttpError(404, 'Not found')
  const s = requireAdmin(req)

  if (p === '/api/admin/logout' && m === 'POST') {
    delete db.sessions[s.id]
    save()
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) })
  }
  if (p === '/api/admin/state' && m === 'GET') {
    return send(res, 200, { seeded: db.seeded, products: db.products, categories: db.categories, brands: db.brands, slides: db.slides, settings: db.settings })
  }
  if (p === '/api/admin/state' && m === 'PUT') {
    Object.assign(db, cleanState(await readBody(req)), { seeded: true })
    save()
    return send(res, 200, { products: db.products, brands: db.brands, slides: db.slides }) // lets the client swap uploaded data URLs for /uploads URLs
  }
  if (p === '/api/admin/orders' && m === 'GET') return send(res, 200, db.orders.map(adminOrder))
  const am = /^\/api\/admin\/orders\/(RT-\d+)$/.exec(p)
  if (am) {
    const o = db.orders.find((x) => x.id === am[1])
    if (!o) throw new HttpError(404, 'Order not found')
    if (m === 'PATCH') {
      const b = await readBody(req)
      if (!STATUSES.includes(b.status)) throw new HttpError(400, 'Invalid status')
      if (b.status !== o.status) pushStatus(o, b.status, 'admin')
      save()
      return send(res, 200, adminOrder(o))
    }
    if (m === 'DELETE') {
      db.orders = db.orders.filter((x) => x.id !== o.id)
      save()
      return send(res, 200, { ok: true })
    }
  }
  if (p === '/api/admin/orders/sample' && m === 'POST') {
    const b = await readBody(req)
    const list = (Array.isArray(b.orders) ? b.orders : []).slice(0, 500)
    for (const o of list) {
      db.orders.push({ id: `RT-${db.nextOrder++}`, createdAt: str(o.createdAt, 40), customer: o.customer, items: o.items, total: num(o.total), status: STATUSES.includes(o.status) ? o.status : 'delivered', history: [{ status: o.status, at: str(o.createdAt, 40), by: 'customer' }], token: crypto.randomBytes(12).toString('hex'), sample: true })
    }
    db.orders.sort((a, b2) => b2.createdAt.localeCompare(a.createdAt))
    save()
    return send(res, 200, db.orders.map(adminOrder))
  }
  if (p === '/api/admin/orders/sample' && m === 'DELETE') {
    db.orders = db.orders.filter((o) => !o.sample)
    save()
    return send(res, 200, db.orders.map(adminOrder))
  }
  if (p === '/api/admin/profile' && m === 'PUT') {
    const b = await readBody(req)
    db.admin.profile = { name: str(b.name, 100) || 'Administrator', email: str(b.email, 200), photo: externalize(str(b.photo, 9_000_000)) }
    save()
    return send(res, 200, meBody())
  }
  if (p === '/api/admin/credentials' && m === 'POST') {
    limit(`cred:${ip(req)}`, 10, 15 * 60_000)
    const b = await readBody(req)
    if (!checkPassword(String(b.currentPassword ?? ''), db.admin)) throw new HttpError(403, 'Your current password is incorrect.')
    const user = str(b.newUsername, 100) || db.admin.user
    if (b.newPassword) {
      if (String(b.newPassword).length < 8) throw new HttpError(400, 'The new password must be at least 8 characters.')
      Object.assign(db.admin, hashPassword(String(b.newPassword)), { mustChange: false })
    }
    db.admin.user = user
    save()
    return send(res, 200, meBody())
  }
  if (p === '/api/admin/backup' && m === 'GET') {
    return send(res, 200, { app: 'raut-traders', exportedAt: new Date().toISOString(), products: db.products, categories: db.categories, brands: db.brands, slides: db.slides, settings: db.settings, orders: db.orders.map(adminOrder) })
  }
  if (p === '/api/admin/restore' && m === 'POST') {
    const b = await readBody(req)
    if (b.app !== 'raut-traders') throw new HttpError(400, 'This file is not a backup from this site.')
    Object.assign(db, cleanState(b), { seeded: true })
    if (Array.isArray(b.orders)) {
      db.orders = b.orders.map((o) => ({ ...o, token: crypto.randomBytes(12).toString('hex'), history: Array.isArray(o.history) ? o.history : [{ status: o.status, at: o.createdAt, by: 'customer' }] }))
      db.nextOrder = Math.max(db.nextOrder, ...db.orders.map((o) => Number(String(o.id).replace(/\D/g, '')) + 1 || 0))
    }
    save()
    return send(res, 200, { ok: true })
  }

  // ---- admin: inbox (contact messages)
  if (p === '/api/admin/contacts' && m === 'GET') {
    const archived = url.searchParams.get('archived') === '1'
    const messages = db.contacts.filter((c) => !!c.archived === archived)
    const unread = db.contacts.filter((c) => !c.read && !c.archived).length
    return send(res, 200, { messages, unread })
  }
  if (p === '/api/admin/contacts/unread' && m === 'GET') {
    return send(res, 200, { unread: db.contacts.filter((c) => !c.read && !c.archived).length })
  }
  if (p === '/api/admin/contacts/read' && m === 'POST') {
    const b = await readBody(req)
    const ids = Array.isArray(b.ids) ? b.ids.map(Number) : []
    ids.forEach((id) => { const c = db.contacts.find((x) => x.id === id); if (c) c.read = true })
    save()
    return send(res, 200, { ok: true })
  }
  const archiveMatch = p.match(/^\/api\/admin\/contacts\/(\d+)\/archive$/)
  if (archiveMatch && m === 'PATCH') {
    const id = Number(archiveMatch[1])
    const b = await readBody(req)
    const c = db.contacts.find((x) => x.id === id)
    if (!c) throw new HttpError(404, 'Message not found')
    c.archived = b.archived !== false
    save()
    return send(res, 200, { ok: true })
  }
  const deleteMatch = p.match(/^\/api\/admin\/contacts\/(\d+)$/)
  if (deleteMatch && m === 'DELETE') {
    const id = Number(deleteMatch[1])
    const before = db.contacts.length
    db.contacts = db.contacts.filter((c) => c.id !== id)
    if (db.contacts.length === before) throw new HttpError(404, 'Message not found')
    save()
    return send(res, 200, { ok: true })
  }

  throw new HttpError(404, 'Not found')
}

function serveFile(res, file, cache) {
  const ext = path.extname(file).toLowerCase()
  const stream = fs.createReadStream(file)
  stream.on('error', () => send(res, 404, { error: 'Not found' }))
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' })
  stream.pipe(res)
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/')) return await api(req, res, url)

    if (url.pathname.startsWith('/uploads/')) {
      const f = path.join(UPLOADS, path.basename(url.pathname))
      return fs.existsSync(f) ? serveFile(res, f, 'public, max-age=31536000, immutable') : send(res, 404, { error: 'Not found' })
    }

    // Static site (the Vite build), with SPA fallback to index.html.
    if (!fs.existsSync(DIST)) return send(res, 200, { message: 'API is running. Build the site first (npm run build) to serve it from here.' })
    let file = path.join(DIST, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''))
    if (!file.startsWith(DIST)) return send(res, 403, { error: 'Forbidden' })
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
    return serveFile(res, file, file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    if (status === 500) console.error(e)
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Server error' : e.message })
  }
})

server.listen(PORT, () => {
  console.log(`Raut Trader's server running on http://localhost:${PORT}`)
  console.log(`Data folder: ${DATA_DIR}`)
  if (db.admin.mustChange) console.log('NOTE: using the default admin login (admin / admin123). Change it in Admin → My account.')
})
