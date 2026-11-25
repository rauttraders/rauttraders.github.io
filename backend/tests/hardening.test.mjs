// Concurrency, duplicate submissions, lost updates, picture validation, hostile JSON.
import { createHash } from 'node:crypto'
import { CATALOGUE, check, Client, ctx, EVIL, freshIp, ownerClient, PNG, section, SITE } from './helpers.mjs'

const sql = (command) => {
  const { persist, run } = ctx()
  try { return JSON.parse(run(['d1', 'execute', 'raut-traders', '--local', '--persist-to', persist, '--json', '--command', command]).stdout)[0].results } catch { return [] }
}
sql('DELETE FROM login_attempts') // earlier suites trigger lockouts on purpose
const owner = await ownerClient()
await owner.put('/api/admin/state', CATALOGUE)
const anon = () => new Client()

// ───────────────────────────────────────────────────────────────────────────
section('Many shops ordering at the same moment ("queue")')
{
  // D1/SQLite runs one write at a time, so simultaneous orders are lined up by the database itself — no extra queue is needed.
  // What must hold: no lost orders, no duplicate numbers, no mixed-up lines, every total right.
  sql('DELETE FROM order_limits')
  const before = sql("SELECT value FROM counters WHERE name = 'order'")[0].value
  const N = 100
  const plan = Array.from({ length: N }, (_, i) => ({ lines: [{ id: 'p1', qty: 1 + (i % 7) }, ...(i % 2 ? [{ id: 'p3', qty: 1 + (i % 5) }] : [])] }))
  const t0 = Date.now()
  const out = await Promise.all(plan.map((p) => new Client(freshIp()).post('/api/orders', { items: p.lines })))
  const ms = Date.now() - t0
  check(`${N} shops order at the same moment: all accepted (no errors, none dropped)`, out.every((r) => r.status === 201), [...new Set(out.map((r) => r.status))].join(','))
  const ids = out.map((r) => Number(r.data?.id?.slice(3)))
  check('…each gets its own order number', new Set(ids).size === N)
  const sorted = [...ids].sort((a, b) => a - b)
  check('…numbers are consecutive, with no gaps', sorted[0] === before + 1 && sorted[N - 1] === before + N && sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1), `${sorted[0]}..${sorted[N - 1]} (counter was ${before})`)
  const ledger = (await owner.get('/api/admin/orders')).data
  const byId = new Map(ledger.map((o) => [o.id, o]))
  const exact = out.every((r, i) => {
    const o = byId.get(r.data.id)
    const want = plan[i].lines.reduce((s, l) => s + l.qty * (l.id === 'p1' ? 30 : 40), 0)
    return o && o.total === want && o.items.length === plan[i].lines.length && plan[i].lines.every((l) => o.items.find((x) => x.id === l.id)?.qty === l.qty)
  })
  check('…and every order holds exactly its own lines and the right total (nothing mixed between shops)', exact)
  console.log(`      (${N} simultaneous orders took ${ms} ms)`)
}

{
  // Orders keep arriving while the admin changes prices.
  sql('DELETE FROM order_limits')
  const flood = Array.from({ length: 60 }, (_, i) => new Client(freshIp()).post('/api/orders', { items: [{ id: 'p1', qty: 1 + (i % 4) }] }))
  const saves = []
  for (let v = 1; v <= 5; v++) {
    const cat = structuredClone(CATALOGUE)
    cat.products[0].price = 30 + v
    saves.push(owner.put('/api/admin/state', cat))
  }
  const [orders, saved] = [await Promise.all(flood), await Promise.all(saves)]
  check('orders placed while the admin saves prices all succeed', orders.every((r) => r.status === 201), [...new Set(orders.map((r) => r.status))].join(','))
  check('…and the saves all succeed too', saved.every((r) => r.status === 200), saved.map((r) => r.status).join(','))
  const ledger = new Map((await owner.get('/api/admin/orders')).data.map((o) => [o.id, o]))
  const prices = new Set([30, 31, 32, 33, 34, 35])
  check('every order was priced with a price that really existed (never a half-saved state)', orders.every((r) => { const o = ledger.get(r.data.id); return o && o.items.length === 1 && prices.has(o.items[0].price) && o.total === o.items[0].price * o.items[0].qty }))
  await owner.put('/api/admin/state', CATALOGUE)
}

section('The same order sent twice (double tap, bad connection, retry)')
{
  sql('DELETE FROM order_limits')
  const key = 'k-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  const body = { items: [{ id: 'p1', qty: 2 }] }
  const ip = freshIp()
  const count = () => sql('SELECT COUNT(*) AS n FROM orders')[0].n
  const before = count()
  const burst = await Promise.all(Array.from({ length: 12 }, () => new Client(ip).post('/api/orders', body, { headers: { 'Idempotency-Key': key } })))
  const ids = new Set(burst.map((r) => r.data?.id))
  check('12 identical submissions with the same key are all answered…', burst.every((r) => r.status === 201 || r.status === 200), burst.map((r) => r.status).join(','))
  check('…with the SAME order number (only one order exists)', ids.size === 1, [...ids].join(','))
  const after = count()
  check('the ledger gained exactly one order', after === before + 1, `${before} → ${after}`)
  let r = await new Client(ip).post('/api/orders', body, { headers: { 'Idempotency-Key': key } })
  check('a later retry with that key still returns the same order', r.data?.id === [...ids][0])
  r = await new Client(ip).post('/api/orders', { items: [{ id: 'p3', qty: 9 }] }, { headers: { 'Idempotency-Key': key } })
  check('the same key with a DIFFERENT basket is refused (422), not silently merged', r.status === 422, `${r.status} ${JSON.stringify(r.data)}`)
  r = await new Client(ip).post('/api/orders', body, { headers: { 'Idempotency-Key': 'k-' + Math.random().toString(36).slice(2) } })
  check('a new key makes a new order', r.status === 201 && !ids.has(r.data.id))
  r = await new Client(ip).post('/api/orders', body, { headers: { 'Idempotency-Key': "bad key'; DROP TABLE orders;--" } })
  check('a malformed key is refused (400)', r.status === 400, r.status)
  r = await new Client(ip).post('/api/orders', body)
  check('orders without a key still work (older clients)', r.status === 201)
  const myKey = `order:${createHash('sha256').update(ip).digest('hex').slice(0, 24)}`
  const hitsNow = () => sql(`SELECT hits FROM order_limits WHERE key = '${myKey}'`)[0]?.hits ?? 0
  const h0 = hitsNow()
  for (let i = 0; i < 5; i++) await new Client(ip).post('/api/orders', body, { headers: { 'Idempotency-Key': key } })
  check('later retries (after the order exists) cost the visitor nothing from the hourly allowance', hitsNow() === h0, `${h0} → ${hitsNow()}`)
}

// ───────────────────────────────────────────────────────────────────────────
section('Two admins (or two tabs) saving the shop at the same time')
{
  const a = await ownerClient(); const b = await ownerClient()
  const sa = (await a.get('/api/admin/state')).data
  const sb = (await b.get('/api/admin/state')).data
  check('the shop data carries a version number', Number.isInteger(sa.version) && sa.version === sb.version, `${sa.version} / ${sb.version}`)
  const editA = { ...structuredClone(CATALOGUE), version: sa.version }; editA.products[0].name = 'Edited by A'
  let r = await a.put('/api/admin/state', editA)
  check('the first save works and returns the new version', r.status === 200 && r.data.version === sa.version + 1, JSON.stringify(r.data).slice(0, 120))
  const editB = { ...structuredClone(CATALOGUE), version: sb.version }; editB.products[0].name = 'Edited by B'
  r = await b.put('/api/admin/state', editB)
  check('the second save, based on the old version, is refused (409) instead of silently overwriting A', r.status === 409, `${r.status} ${JSON.stringify(r.data)}`)
  check('…and the message tells them to reload', /reload|changed/i.test(r.data?.error ?? ''), r.data?.error)
  check('A\'s change is still there', (await owner.get('/api/admin/state')).data.products[0].name === 'Edited by A')
  const fresh = (await b.get('/api/admin/state')).data
  r = await b.put('/api/admin/state', { ...structuredClone(CATALOGUE), version: fresh.version })
  check('after reloading, B can save', r.status === 200)
  r = await b.put('/api/admin/state', structuredClone(CATALOGUE))
  check('a save that sends no version (older tools) is still accepted', r.status === 200)
}

// ───────────────────────────────────────────────────────────────────────────
section('Pictures: size, type, real signature and PIXEL dimensions')
{
  const dataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
  const le16 = (n) => [n & 255, (n >> 8) & 255]
  const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255]
  const png = (w, h) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...u32(w), ...u32(h), 8, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0]
  const gif = (w, h) => [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...le16(w), ...le16(h), 0, 0, 0, 0x3b]
  const jpeg = (w, h) => [0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 1, 1, 0x11, 0, 0xff, 0xd9]
  const webpX = (w, h) => [0x52, 0x49, 0x46, 0x46, 22, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]
  const put = (img) => { const c = structuredClone(CATALOGUE); c.products[0].image = img; return owner.put('/api/admin/state', c) }

  let r = await put(dataUrl('image/png', png(640, 640))); check('a normal PNG (640×640) is accepted', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`)
  r = await put(dataUrl('image/png', png(20000, 20000))); check('a tiny PNG that decodes to 20 000 × 20 000 pixels (a "pixel bomb") is refused', r.status === 400 || r.status === 413, r.status)
  r = await put(dataUrl('image/png', png(4097, 100))); check('a PNG wider than 4096 pixels is refused', r.status === 400 || r.status === 413, r.status)
  r = await put(dataUrl('image/png', png(4096, 4096))); check('a 4096 × 4096 PNG (16 megapixels) is the allowed maximum', r.status === 200, r.status)
  r = await put(dataUrl('image/png', png(0, 0))); check('a PNG claiming 0 × 0 pixels is refused', r.status === 400, r.status)
  r = await put(dataUrl('image/gif', gif(30000, 30000))); check('a GIF pixel bomb is refused', r.status === 400 || r.status === 413, r.status)
  r = await put(dataUrl('image/gif', gif(100, 100))); check('a normal GIF is accepted', r.status === 200, r.status)
  r = await put(dataUrl('image/jpeg', jpeg(60000, 60000))); check('a JPEG pixel bomb is refused', r.status === 400 || r.status === 413, r.status)
  r = await put(dataUrl('image/jpeg', jpeg(800, 600))); check('a normal JPEG is accepted', r.status === 200, r.status)
  r = await put(dataUrl('image/webp', webpX(16000, 16000))); check('a WebP pixel bomb is refused', r.status === 400 || r.status === 413, r.status)
  r = await put(dataUrl('image/webp', webpX(960, 600))); check('a normal WebP is accepted', r.status === 200, r.status)
  r = await put(dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 1, 2, 3])); check('a truncated file (valid start, no size information) is refused', r.status === 400, r.status)
  r = await put(dataUrl('image/png', [...png(100, 100), ...Buffer.from('<script>alert(1)</script>')])); check('a PNG with a script appended is accepted as a picture but is only ever served as an image (never as a page)', r.status === 200)
  const ref = r.data?.products?.[0]?.image
  const served = await anon().get(ref)
  check('…served as image/png, nosniff, sandboxed — the script can never run', served.headers.get('content-type') === 'image/png' && served.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(served.headers.get('content-security-policy')))
  r = await put('data:image/png;base64,' + 'A'.repeat(100) + '%%%'); check('a corrupt base64 string is refused', r.status === 400, r.status)
  r = await put('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64')); check('SVG is refused', r.status === 400, r.status)
  r = await put(dataUrl('image/png', jpeg(10, 10))); check('a JPEG labelled as PNG is refused (label and contents must match)', r.status === 400, r.status)
  await owner.put('/api/admin/state', CATALOGUE)

  // How the bytes are stored: binary in the database, not base64 text.
  await put(PNG)
  const row = sql("SELECT mime, size, typeof(bytes) AS kind, length(bytes) AS len FROM images ORDER BY created_at DESC LIMIT 1")[0]
  check('stored as binary (BLOB) inside the database — no files, no base64 text', row?.kind === 'blob' && row.len === row.size, JSON.stringify(row))
  await owner.put('/api/admin/state', CATALOGUE)
}

// ───────────────────────────────────────────────────────────────────────────
section('Hostile JSON and odd text')
{
  const put = (patch) => owner.put('/api/admin/state', { ...structuredClone(CATALOGUE), ...patch })
  const deep = (n) => { let o = {}; const root = o; for (let i = 0; i < n; i++) { o.a = {}; o = o.a } return root }
  let r = await owner.call('PUT', '/api/admin/state', '{"products":[],"categories":[],"settings":{"__proto__":{"polluted":true}}}', { json: true })
  check('a "__proto__" key in settings is refused (prototype pollution)', r.status === 400, r.status)
  r = await owner.call('PUT', '/api/admin/state', '{"products":[],"categories":[],"settings":{"business":{"constructor":{"prototype":{"x":1}}}}}', { json: true })
  check('"constructor" / "prototype" keys are refused too', r.status === 400, r.status)
  r = await put({ settings: deep(50) }); check('deeply nested settings are refused (400)', r.status === 400 || r.status === 413, r.status)
  r = await owner.call('PUT', '/api/admin/state', '['.repeat(100000) + ']'.repeat(100000), { json: true }); check('a 100 000-level nested body does not crash the server (4xx)', r.status >= 400 && r.status < 500, r.status)
  r = await put({ settings: { business: { name: { evil: 'object' } } } }); check('settings with a text field that is really an object are refused', r.status === 400, r.status)
  r = await put({ settings: { business: { name: 'x'.repeat(5000) } } }); check('a 5 000-character settings value is refused', r.status === 400 || r.status === 413, r.status)
  r = await put({ settings: { list: Array.from({ length: 500 }, (_, i) => i) } }); check('a 500-item list inside settings is refused', r.status === 400 || r.status === 413, r.status)
  r = await put({ settings: { business: { name: "Raut Trader's", phone: '+91 98765 43210', lat: 18.52, lng: 73.85, open: true } } }); check('normal settings (text, numbers, true/false) are accepted', r.status === 200, r.status)
  r = await put({ settings: { business: { lat: 1e999 } } }); check('an infinite number in settings is refused', r.status === 400, r.status)
  r = await put({ products: [{ ...CATALOGUE.products[0], name: 'Pay‮exe.txt' }] }); check('a right-to-left override character in a name (text-spoofing trick) is refused', r.status === 400, r.status)
  r = await put({ products: [{ ...CATALOGUE.products[0], name: 'Hello\u0000World' }] }); check('a NUL byte in a name is refused', r.status === 400, r.status)
  r = await put({ products: [{ ...CATALOGUE.products[0], name: 'बिस्किट 🍪 Biscuit' }] }); check('Hindi / Marathi / emoji names are accepted', r.status === 200, r.status)
  r = await put({ products: [{ ...CATALOGUE.products[0], name: '<img src=x onerror=alert(1)>' }] }); check('markup in a name is accepted as plain text (it is escaped when shown — see the browser tests)', r.status === 200, r.status)
  r = await owner.call('PUT', '/api/admin/state', JSON.stringify({ products: [], categories: [], brands: [], slides: [], ['__proto__']: { x: 1 } }), { json: true }); check('top-level "__proto__" is harmless', r.status === 200 || r.status === 400, r.status)
  await owner.put('/api/admin/state', CATALOGUE)
}
void EVIL; void SITE
