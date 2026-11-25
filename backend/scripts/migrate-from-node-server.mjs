#!/usr/bin/env node
// Moves the shop's data from the OLD Node server (frontend/server/data) into the new Cloudflare database.
//
//   node scripts/migrate-from-node-server.mjs --url http://127.0.0.1:8787 --user admin --pass <admin password>
//   node scripts/migrate-from-node-server.mjs --url https://raut-traders.<you>.workers.dev --user owner --pass <password> --data ../frontend/server/data
//
// What is copied: products, categories, brands, slides, site settings, and the order ledger (items + totals).
// What is NOT copied: customer names, phones, addresses, tokens, order statuses — personal data stays behind.
// Pictures from the old uploads/ folder are sent inside the request and stored in the database (limit 1.5 MB each).
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith('--') ? [...acc, [v.slice(2), a[i + 1]]] : acc), []))
const url = (args.url || 'http://127.0.0.1:8787').replace(/\/$/, '')
const dataDir = path.resolve(args.data || path.join(import.meta.dirname, '..', '..', 'frontend', 'server', 'data'))
if (!args.user || !args.pass) {
  console.error('Usage: node scripts/migrate-from-node-server.mjs --url <site url> --user <admin> --pass <password> [--data <old data folder>]')
  process.exit(1)
}

const db = JSON.parse(fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'))
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }
let imagesInlined = 0
const skipped = []

/** "/uploads/abc.jpg" → data: URL read from the old uploads folder. Anything else ("asset:…", http URLs, "") is kept as is. */
function inline(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('/uploads/')) return ref
  const file = path.join(dataDir, 'uploads', path.basename(ref))
  const mime = MIME[path.extname(file).toLowerCase()]
  if (!mime || !fs.existsSync(file)) { skipped.push(`${ref} (missing or unsupported type)`); return '' }
  const bytes = fs.readFileSync(file)
  if (bytes.length > 1_500_000) { skipped.push(`${ref} (${(bytes.length / 1e6).toFixed(1)} MB is over the 1.5 MB limit)`); return '' }
  imagesInlined++
  return `data:${mime};base64,${bytes.toString('base64')}`
}

const payload = {
  app: 'raut-traders',
  products: (db.products || []).map((p) => ({ ...p, image: inline(p.image) })),
  categories: db.categories || [],
  brands: (db.brands || []).map((b) => ({ ...b, logo: inline(b.logo) })),
  slides: (db.slides || []).map((s) => ({ ...s, image: inline(s.image) })),
  settings: db.settings || null,
  // Only what was ordered. No customer block, no tracking token, no status history.
  orders: (db.orders || []).map((o) => ({ id: o.id, createdAt: o.createdAt, sample: !!o.sample, items: o.items })),
}

async function call(method, route, body, cookie) {
  const res = await fetch(url + route, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { res, data: await res.json().catch(() => ({})) }
}

const login = await call('POST', '/api/admin/login', { user: args.user, pass: args.pass })
if (!login.res.ok) { console.error(`Sign-in failed (${login.res.status}): ${login.data.error ?? ''}`); process.exit(1) }
const cookie = login.res.headers.get('set-cookie').split(';')[0]
if (login.data.mustChange) {
  console.error('This admin still has the temporary password, and the server refuses data changes until it is replaced.\nOpen the admin panel, sign in, choose a new password (Admin → My account), then run this script again with the new password.')
  process.exit(1)
}

console.log(`Sending ${payload.products.length} products, ${payload.categories.length} categories, ${payload.brands.length} brands, ${payload.slides.length} slides, ${payload.orders.length} orders, ${imagesInlined} pictures…`)
const out = await call('POST', '/api/admin/restore', payload, cookie)
if (!out.res.ok) { console.error(`Migration failed (${out.res.status}): ${out.data.error ?? ''}`); process.exit(1) }
if (skipped.length) console.warn('\nThese pictures were not copied — upload them again in Admin → Products:\n  ' + skipped.join('\n  '))
console.log('\nDone. Customer details were not copied.')
