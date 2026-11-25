// Attack-style tests: lockout, rate limiting, input validation, sessions, headers, abuse, data integrity.
import { spawnSync } from 'node:child_process'
import { CATALOGUE, check, Client, ctx, EVIL, freshIp, OWNER, ownerClient, PNG, section, SITE } from './helpers.mjs'

const owner = await ownerClient()
await owner.put('/api/admin/state', CATALOGUE)
const anon = () => new Client()

/** Runs a SQL statement on the temporary test database (to age rows / read them back). */
const sql = (command) => {
  const { persist, root, run } = ctx()
  const out = run(['d1', 'execute', 'raut-traders', '--local', '--persist-to', persist, '--json', '--command', command])
  try { return JSON.parse(out.stdout)[0].results } catch { return [] }
}

// ───────────────────────────────────────────────────────────────────────────
section('Login lockout')
{
  const attacker = new Client('203.0.113.10')
  const codes = []
  for (let i = 0; i < 6; i++) codes.push((await attacker.login(OWNER.user, 'wrong-' + i)).status)
  check('5 wrong passwords, then 429 for that visitor + username', codes.slice(0, 5).every((s) => s === 401) && codes[5] === 429, codes.join(','))
  let r = await attacker.login(OWNER.user, OWNER.pass)
  check('while locked, even the CORRECT password is refused', r.status === 429, r.status)
  check('the lock message says how long to wait', /minute/.test(r.data?.error ?? ''), r.data?.error)

  const owner2 = new Client('198.51.100.7')
  r = await owner2.login(OWNER.user, OWNER.pass)
  check('the real owner on another network can still sign in (attacker cannot lock them out)', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`)

  const a = (await new Client('203.0.113.11').login(OWNER.user, 'nope')).data?.error
  const b = (await new Client('203.0.113.12').login('no-such-user', 'nope')).data?.error
  check('unknown user and wrong password give the SAME message (no user enumeration)', a === b && a === 'Incorrect username or password', `${a} | ${b}`)

  const sprayer = new Client('203.0.113.20')
  const spray = []
  for (let i = 0; i < 22; i++) spray.push((await sprayer.login('guess-' + i, 'x')).status)
  check('one address trying many usernames is blocked too (429)', spray.slice(20).every((s) => s === 429) && spray[0] === 401, spray.join(','))
  r = await sprayer.login(OWNER.user, OWNER.pass)
  check('…even for the real username with the right password', r.status === 429, r.status)

  // A botnet: 35 different addresses all guessing the owner's password.
  const botCodes = []
  for (let i = 0; i < 35; i++) botCodes.push((await new Client(`192.0.2.${i + 1}`).login(OWNER.user, 'guess-' + i)).status)
  r = await new Client('198.51.100.99').login(OWNER.user, OWNER.pass)
  check('a distributed attack on one username locks that username for everyone (429)', r.status === 429, `${r.status} after ${botCodes.filter((s) => s === 401).length} failures`)
  sql("UPDATE login_attempts SET locked_until = 0, fails = 0")
  r = await new Client('198.51.100.98').login(OWNER.user, OWNER.pass)
  check('…and the lock lifts when it expires', r.status === 200, r.status)

  const c = new Client('198.51.100.50')
  for (let i = 0; i < 3; i++) await c.login(OWNER.user, 'bad')
  await c.login(OWNER.user, OWNER.pass)
  const codes2 = []
  for (let i = 0; i < 4; i++) codes2.push((await c.login(OWNER.user, 'bad')).status)
  check('a successful sign-in resets that visitor\'s failure counter', codes2.every((s) => s === 401), codes2.join(','))
}

section('Password-change lockout')
{
  const c = await ownerClient()
  const codes = []
  for (let i = 0; i < 6; i++) codes.push((await c.post('/api/admin/credentials', { currentPassword: 'wrong' + i, newPassword: 'Whatever-Pass-55' })).status)
  check('guessing the current password is locked after 5 tries', codes.slice(0, 5).every((s) => s === 403) && codes[5] === 429, codes.join(','))
  sql("UPDATE login_attempts SET locked_until = 0, fails = 0")
}

// ───────────────────────────────────────────────────────────────────────────
section('Rate limiting')
{
  const a = new Client('198.51.100.60')
  const codes = []
  for (let i = 0; i < 17; i++) codes.push((await a.post('/api/orders', { items: [{ id: 'p1', qty: 1 }] })).status)
  check('one visitor can place 15 orders an hour, then 429', codes.slice(0, 15).every((s) => s === 201) && codes.slice(15).every((s) => s === 429), codes.join(','))
  const r = await new Client('198.51.100.61').post('/api/orders', { items: [{ id: 'p1', qty: 1 }] })
  check('a different visitor is not affected', r.status === 201, r.status)
  const rows = sql("SELECT key FROM order_limits WHERE key LIKE 'order:%' AND key != 'order:all'")
  check('visitor addresses are stored only as hashes', rows.length > 0 && rows.every((x) => /^order:[0-9a-f]{24}$/.test(x.key)), JSON.stringify(rows.slice(0, 2)))

  const flooder = new Client('198.51.100.70')
  const burst = await Promise.all(Array.from({ length: 200 }, () => flooder.get('/api/health')))
  const limited = burst.filter((x) => x.status === 429).length
  check('a flood from one address is cut off early (429) before it reaches the database', limited > 20, `${limited} of 200 limited`)
  const r2 = await new Client('198.51.100.71').get('/api/health')
  check('other visitors are unaffected by the flood', r2.status === 200)

  const loginFlood = new Client('198.51.100.72')
  const lf = await Promise.all(Array.from({ length: 30 }, (_, i) => loginFlood.login('someone' + i, 'x')))
  check('rapid-fire sign-in attempts are throttled (429) before any password work', lf.filter((x) => x.status === 429).length > 10, lf.map((x) => x.status).join(','))
}

{
  // Whole-site cap on orders per hour (protects the database from a botnet of many addresses).
  sql("UPDATE order_limits SET hits = 0")
  const codes = []
  for (let i = 0; i < 12; i++) codes.push((await new Client(freshIp()).post('/api/orders', { items: [{ id: 'p3', qty: 1 }] })).status)
  check('normal traffic from many visitors is accepted', codes.every((s) => s === 201), codes.join(','))
  sql("INSERT INTO order_limits (key, hits, window_start) VALUES ('order:all', 100000, " + Date.now() + ") ON CONFLICT(key) DO UPDATE SET hits = 100000, window_start = " + Date.now())
  const r = await new Client(freshIp()).post('/api/orders', { items: [{ id: 'p3', qty: 1 }] })
  check('when the whole-site hourly order cap is hit, new orders get 429 (database protected)', r.status === 429, r.status)
  sql("DELETE FROM order_limits")
}

// ───────────────────────────────────────────────────────────────────────────
section('Input validation — public order form')
{
  const c = anon()
  const bad = async (name, body, want = 400) => {
    const r = await c.post('/api/orders', body, { ip: freshIp() })
    check(name, r.status === want, `${r.status} ${JSON.stringify(r.data)}`)
  }
  await bad('no items', { items: [] })
  await bad('items is not a list', { items: 'p1' })
  await bad('body is not an object', [1, 2, 3])
  await bad('body is null', null)
  await bad('quantity 0', { items: [{ id: 'p1', qty: 0 }] })
  await bad('negative quantity', { items: [{ id: 'p1', qty: -5 }] })
  await bad('fractional quantity (1.5)', { items: [{ id: 'p1', qty: 1.5 }] })
  await bad('quantity 1000', { items: [{ id: 'p1', qty: 1000 }] })
  await bad('quantity as text', { items: [{ id: 'p1', qty: 'lots' }] })
  await bad('quantity NaN-ish string', { items: [{ id: 'p1', qty: 'NaN' }] })
  await bad('product id is an object', { items: [{ id: { $ne: 1 }, qty: 1 }] })
  await bad('product id missing', { items: [{ qty: 1 }] })
  await bad('an item that is not an object', { items: ['p1'] })
  await bad('61 lines', { items: Array.from({ length: 61 }, (_, i) => ({ id: 'p' + i, qty: 1 })) })
  await bad('sneaky SQL in a product id is refused as an invalid id', { items: [{ id: "p1' OR '1'='1", qty: 1 }] })
  await bad('a script tag in a product id is refused as an invalid id', { items: [{ id: '<script>alert(1)</script>', qty: 1 }] })

  let r = await c.call('POST', '/api/orders', '{"items": [', { headers: { 'Content-Type': 'application/json' }, ip: freshIp() })
  check('broken JSON → 400, not a crash', r.status === 400, r.status)
  r = await c.call('POST', '/api/orders', 'items=p1', { headers: { 'Content-Type': 'text/plain' }, ip: freshIp() })
  check('wrong content type → 415', r.status === 415, r.status)
  r = await c.call('POST', '/api/orders', 'x'.repeat(200_000), { headers: { 'Content-Type': 'application/json' }, ip: freshIp() })
  check('a 200 KB order body is refused (413) before it is parsed', r.status === 413, r.status)
  r = await c.call('PUT', '/api/orders', '{}', { headers: { 'Content-Type': 'application/json' }, ip: freshIp() })
  check('wrong HTTP method → 404/405, not 500', [404, 405].includes(r.status), r.status)
  const long = 'A'.repeat(5000)
  r = await c.post('/api/orders', { items: [{ id: long, qty: 1 }] }, { ip: freshIp() })
  check('a 5000-character product id is handled safely (4xx)', r.status >= 400 && r.status < 500, r.status)
}

section('Input validation — admin catalogue')
{
  const put = (patch) => owner.put('/api/admin/state', { ...structuredClone(CATALOGUE), ...patch })
  const prod = (over) => ({ ...CATALOGUE.products[0], ...over })
  let r
  r = await put({ products: [prod({ price: -5 })] }); check('negative price is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ price: 1e15 })] }); check('absurdly large price is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ price: 'cheap' })] }); check('non-numeric price is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ id: '<img src=x onerror=alert(1)>' })] }); check('an id containing HTML is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ id: 'has space' })] }); check('an id containing spaces is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ name: '' })] }); check('a product without a name is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ id: 'a' }), prod({ id: 'a' })] }); check('duplicate product ids are refused, not silently merged', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ image: 'javascript:alert(1)' })] }); check('image reference "javascript:" is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ image: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' })] }); check('image reference "data:text/html" is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })] }); check('SVG uploads are refused (can carry scripts)', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ image: 'https://example.com/pic.jpg' })] }); check('a normal https image URL is allowed', r.status === 200, `${r.status}`)
  r = await put({ products: [prod({ image: '/uploads/' + 'a'.repeat(64) })] }); check('a normal /uploads reference is allowed', r.status === 200, `${r.status}`)
  r = await put({ products: [prod({ image: 'data:image/png;base64,@@@not-base64@@@' })] }); check('a corrupt picture is refused', r.status === 400, `${r.status}`)
  r = await put({ products: [prod({ image: 'data:image/png;base64,' + Buffer.alloc(1_700_000, 1).toString('base64') })] }); check('a 1.7 MB picture is refused (413)', r.status === 413, `${r.status}`)
  r = await put({ products: Array.from({ length: 1001 }, (_, i) => prod({ id: 'x' + i })) }); check('more than 1000 products is refused, not silently cut', r.status === 413 || r.status === 400, `${r.status}`)
  r = await put({ settings: { junk: 'x'.repeat(300_000) } }); check('oversized settings are refused (413)', r.status === 413, `${r.status}`)
  r = await put({ settings: 'a string' }); check('settings that are not an object are ignored, not stored', r.status === 200, `${r.status}`)
  r = await put({ categories: 'nope' }); check('categories that are not a list → 400', r.status === 400, `${r.status}`)
  r = await owner.call('PUT', '/api/admin/state', '{"products": [', { json: true }); check('broken JSON → 400', r.status === 400, `${r.status}`)
  r = await owner.put('/api/admin/state', null); check('null body → 400', r.status === 400, `${r.status}`)
  r = await owner.call('PUT', '/api/admin/state', 'x'.repeat(30_000_000), { json: true }); check('a 30 MB body is refused (413)', r.status === 413, `${r.status}`)
  await owner.put('/api/admin/state', CATALOGUE)
}

section('Input validation — sign-in and account')
{
  const c = new Client(freshIp())
  let r = await c.post('/api/admin/login', { user: { $gt: '' }, pass: { $gt: '' } }); check('an object instead of a username/password → 401, not 500', r.status === 401, `${r.status}`)
  r = await c.post('/api/admin/login', { user: ['a'], pass: ['b'] }); check('arrays instead of strings → 401', r.status === 401, `${r.status}`)
  r = await c.post('/api/admin/login', {}); check('empty login body → 401', r.status === 401, `${r.status}`)
  r = await c.post('/api/admin/login', { user: 'x'.repeat(100_000), pass: 'y'.repeat(100_000) }); check('100 KB username/password → handled (4xx)', r.status >= 400 && r.status < 500, `${r.status}`)
  r = await c.call('POST', '/api/admin/login', 'user=a&pass=b', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); check('form-encoded login → 415', r.status === 415, `${r.status}`)
  r = await c.call('POST', '/api/admin/login', '{bad', { json: true }); check('broken JSON login → 400', r.status === 400, `${r.status}`)

  const o = await ownerClient()
  const cred = (b) => o.post('/api/admin/credentials', { currentPassword: OWNER.pass, ...b })
  r = await cred({ newPassword: 'short' }); check('password under 8 characters is refused', r.status === 400, `${r.status}`)
  r = await cred({ newPassword: 'password' }); check('a very common password is refused', r.status === 400, `${r.status}`)
  r = await cred({ newPassword: 'admin1234' }); check('"admin1234" is refused', r.status === 400, `${r.status}`)
  r = await cred({ newPassword: '11111111' }); check('a repeated-character password is refused', r.status === 400, `${r.status}`)
  r = await cred({ newUsername: 'owner', newPassword: 'owner' + '1234' }); check('a password that is just the username is refused', r.status === 400, `${r.status}`)
  r = await cred({ newPassword: 'x'.repeat(201) }); check('a 201-character password is refused', r.status === 400, `${r.status}`)
  r = await cred({ newUsername: 'ab' }); check('a 2-character username is refused', r.status === 400, `${r.status}`)
  r = await cred({ newUsername: '<script>alert(1)</script>' }); check('a username with HTML characters is refused', r.status === 400, `${r.status}`)
  r = await cred({ newUsername: 'has space' }); check('a username with spaces is refused', r.status === 400, `${r.status}`)
  r = await o.put('/api/admin/profile', { name: 'N'.repeat(1000), email: 'not-an-email' }); check('an invalid e-mail address is refused', r.status === 400, `${r.status}`)
  r = await o.put('/api/admin/profile', { name: 'N'.repeat(1000), email: '' }); check('an over-long display name is cut to 100, not an error', r.status === 200 && r.data.profile.name.length === 100, `${r.status} ${r.data?.profile?.name?.length}`)
}

// ───────────────────────────────────────────────────────────────────────────
section('Sessions and tokens')
{
  const c = anon()
  const forged = ['0'.repeat(64), 'a'.repeat(64), "' OR 1=1 --", 'z'.repeat(5000), '', 'A'.repeat(64), '0'.repeat(63), '0'.repeat(65)]
  const out = []
  for (const f of forged) out.push((await c.get('/api/admin/me', { headers: { Authorization: `Bearer ${f}` } })).status)
  for (const h of ['Bearer', 'Basic YWRtaW46YWRtaW4=', `Token ${'a'.repeat(64)}`, `bearer ${'a'.repeat(64)}`, `Bearer  ${'a'.repeat(64)}`]) out.push((await c.get('/api/admin/me', { headers: { Authorization: h } })).status)
  check('forged / malformed / wrong-scheme tokens → 401, never a crash', out.every((x) => x === 401), out.join(','))
  const cookieOnly = await c.get('/api/admin/me', { headers: { Cookie: `rt_sid=${'a'.repeat(64)}; __Host-rt_sid=${'a'.repeat(64)}` } })
  check('cookies are ignored entirely (nothing to steal or forge)', cookieOnly.status === 401)

  const s = await ownerClient()
  check('a real session works', (await s.get('/api/admin/me')).status === 200)
  sql('UPDATE sessions SET expires_at = 1')
  check('an expired session is rejected', (await s.get('/api/admin/me')).status === 401)

  const t = await ownerClient()
  let r = await t.put('/api/admin/profile', { name: 'x' }, { headers: { Origin: EVIL } }); check('a write that names a foreign site as its origin → 403', r.status === 403, r.status)
  r = await t.call('POST', '/api/admin/logout', '{}', { headers: { 'Content-Type': 'text/plain' } }); check('a write with a non-JSON content type → 415', r.status === 415, r.status)
  r = await t.put('/api/admin/profile', { name: 'Owner' }, { headers: { Origin: SITE } }); check('a write from our own website is accepted', r.status === 200, r.status)
  r = await t.put('/api/admin/profile', { name: 'Owner' }); check('a write with no Origin (curl, scripts) is accepted when the token is right', r.status === 200, r.status)
  r = await anon().post('/api/admin/login', { user: OWNER.user, pass: OWNER.pass }, { headers: { Origin: EVIL } }); check('a sign-in attempt from a foreign site → 403', r.status === 403, r.status)

  const d = await ownerClient()
  const rows = sql('SELECT id FROM sessions LIMIT 5')
  check('the database stores only a hash of the session token, never the token', rows.length > 0 && !rows.some((x) => x.id === d.token) && rows.every((x) => /^[0-9a-f]{64}$/.test(x.id)))
  const pw = sql('SELECT password_hash FROM admins')[0]?.password_hash ?? ''
  check('passwords are stored as salted, peppered PBKDF2 hashes', /^pbkdf2p\$sha256\$\d+\$/.test(pw) && !pw.includes(OWNER.pass), pw.slice(0, 30))

  const cookies = []
  for (const [m, path, body] of [['GET', '/api/public'], ['POST', '/api/admin/login', { user: 'x', pass: 'y' }], ['GET', '/api/admin/me'], ['POST', '/api/admin/logout', {}]]) {
    const x = await new Client(freshIp()).call(m, path, body, { json: m === 'POST' }); cookies.push(x.headers.get('set-cookie'))
  }
  check('no endpoint ever sets a cookie', cookies.every((x) => !x), JSON.stringify(cookies))
}

section('Cross-origin access (CORS): only our website')
{
  const c = anon()
  let r = await c.call('OPTIONS', '/api/admin/state', undefined, { noAuth: true, headers: { Origin: SITE, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } })
  const allowHeaders = (r.headers.get('access-control-allow-headers') ?? '').toLowerCase()
  check('pre-flight from our website → 204 with that exact origin', r.status === 204 && r.headers.get('access-control-allow-origin') === SITE, `${r.status} ${r.headers.get('access-control-allow-origin')}`)
  check('…allowing only Authorization, Content-Type and Idempotency-Key headers, and the needed methods', allowHeaders.includes('authorization') && allowHeaders.includes('content-type') && allowHeaders.includes('idempotency-key') && /PUT/.test(r.headers.get('access-control-allow-methods') ?? '') && !/\*/.test(allowHeaders))
  check('…and never "*" and never credentials', r.headers.get('access-control-allow-origin') !== '*' && !r.headers.get('access-control-allow-credentials'))
  r = await c.call('OPTIONS', '/api/admin/state', undefined, { noAuth: true, headers: { Origin: EVIL, 'Access-Control-Request-Method': 'PUT' } })
  check('pre-flight from any other site → 403 with no permission headers', r.status === 403 && !r.headers.get('access-control-allow-origin'), `${r.status}`)
  r = await c.call('OPTIONS', '/api/orders', undefined, { noAuth: true, headers: { 'Access-Control-Request-Method': 'POST' } })
  check('pre-flight with no Origin at all → 403', r.status === 403, r.status)
  r = await c.get('/api/public', { headers: { Origin: SITE } })
  check('the catalogue sent to our website carries its allow-origin + Vary: Origin', r.headers.get('access-control-allow-origin') === SITE && /origin/i.test(r.headers.get('vary') ?? ''), `${r.headers.get('access-control-allow-origin')} | ${r.headers.get('vary')}`)
  r = await c.get('/api/public', { headers: { Origin: SITE } })
  check('…also when answered from the edge cache', r.headers.get('access-control-allow-origin') === SITE)
  r = await c.get('/api/public', { headers: { Origin: EVIL } })
  check('a foreign site gets NO allow-origin header (the browser will not let it read the answer)', r.status === 200 && !r.headers.get('access-control-allow-origin'))
  r = await c.get('/api/public')
  check('a request with no Origin gets none either (and nothing leaks a previous visitor\'s origin)', !r.headers.get('access-control-allow-origin'))
  r = await c.post('/api/orders', { items: [{ id: 'p1', qty: 1 }] }, { headers: { Origin: EVIL }, ip: freshIp() })
  check('placing an order is answered, but only our website can read it (no allow-origin for a foreign site)', !r.headers.get('access-control-allow-origin'))
  const flood = await Promise.all(Array.from({ length: 150 }, () => new Client('198.51.100.90').get('/api/health', { headers: { Origin: SITE } })))
  const limited = flood.find((x) => x.status === 429)
  check('a rate-limited answer is still readable by our website (so it can show "slow down")', !!limited && limited.headers.get('access-control-allow-origin') === SITE, limited ? limited.headers.get('access-control-allow-origin') : 'no 429 seen')
  const up = (await ownerClient()).put('/api/admin/profile', { name: 'O', photo: PNG })
  const photo = (await up).data?.profile?.photo
  r = await c.get(photo, { headers: { Origin: SITE } })
  check('pictures can be used by our website (including for editing in a canvas)', r.status === 200 && r.headers.get('access-control-allow-origin') === SITE, `${r.status} ${r.headers.get('access-control-allow-origin')}`)
}

section('The first-admin password rule')
{
  // Same Worker, but reached under a public-looking host name: weak seed passwords must not be accepted there.
  const { base, persist } = ctx()
  const port = new URL(base).port
  sql('DELETE FROM sessions')
  const hostCall = (path, body) => spawnSync('curl', ['-s', '-m', '10', '-o', '-', '-w', '\n%{http_code}', '--resolve', `shop.example.com:${port}:127.0.0.1`, '-H', 'Content-Type: application/json', '-H', 'CF-Connecting-IP: 198.51.100.200', '-d', JSON.stringify(body), `http://shop.example.com:${port}${path}`], { encoding: 'utf8' }).stdout
  sql('DELETE FROM admins')
  const out = hostCall('/api/admin/login', { user: 'admin', pass: 'admin123' })
  const code = out.trim().split('\n').pop()
  check('on a public host name the weak seed password "admin123" is NOT accepted (503/400)', ['503', '400', '401'].includes(code), out.trim())
  const admins = sql('SELECT COUNT(*) AS n FROM admins')[0]?.n
  check('…and no admin account was created from it', admins === 0, admins)
}

// ───────────────────────────────────────────────────────────────────────────
section('Response headers and error hygiene')
{
  const c = anon()
  let r = await c.get('/api/public')
  const h = (n) => r.headers.get(n)
  check('API responses: nosniff, DENY framing, strict CSP', h('x-content-type-options') === 'nosniff' && h('x-frame-options') === 'DENY' && /default-src 'none'/.test(h('content-security-policy') ?? ''), [h('x-content-type-options'), h('x-frame-options'), h('content-security-policy')].join(' | '))
  r = await c.get('/api/admin/me')
  check('admin responses are never cached', /no-store/.test(r.headers.get('cache-control') ?? ''))
  r = await c.get('/api/admin/me')
  check('errors are JSON with no stack traces or file paths', r.status === 401 && !/at |\.ts|node_modules/.test(JSON.stringify(r.data)), JSON.stringify(r.data))
  r = await c.get('/')
  check('even the root address carries the security headers', r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'DENY' && r.headers.get('referrer-policy') === 'no-referrer')
}

// ───────────────────────────────────────────────────────────────────────────
section('Audit trail')
{
  const o = await ownerClient()
  await o.put('/api/admin/state', CATALOGUE)
  await o.del('/api/admin/orders/RT-999999')
  const r = await o.get('/api/admin/audit')
  const actions = (r.data ?? []).map((x) => x.action)
  check('admin actions are recorded (who / what / when)', r.status === 200 && actions.includes('catalogue.save') && actions.includes('login'), JSON.stringify(actions.slice(0, 8)))
  const dump = JSON.stringify(r.data ?? [])
  check('the audit log holds no passwords, session tokens or secrets', !dump.includes(OWNER.pass) && !dump.includes('Another-Pass-2026') && !dump.includes('admin123') && !dump.includes('local-dev-pepper') && !/[0-9a-f]{64}/.test(dump))
  check('only an admin can read the audit log', (await anon().get('/api/admin/audit')).status === 401)
}

// ───────────────────────────────────────────────────────────────────────────
section('Large data and restore')
{
  const o = await ownerClient()
  const items = [{ id: 'p1', name: 'Marie Gold', company: 'Britannia', categoryId: 'biscuits', size: '250 g', price: 30, qty: 2 }]
  const many = Array.from({ length: 2500 }, (_, i) => ({ id: `RT-${50000 + i}`, createdAt: new Date(Date.now() - i * 60000).toISOString(), items }))
  const before = (await o.get('/api/admin/orders')).data.length
  const backup = { app: 'raut-traders', ...CATALOGUE, orders: many }
  let r = await o.post('/api/admin/restore', backup)
  check('a backup with 2,500 orders restores', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`)
  const n = sql('SELECT COUNT(*) AS n FROM orders')[0]?.n
  check('…and none are silently dropped', n === 2500, `${n} stored`)
  const bk = (await o.get('/api/admin/backup')).data
  check('a new backup contains all of them', bk.orders.length === 2500, bk.orders.length)
  r = await o.post('/api/admin/restore', { app: 'raut-traders', ...CATALOGUE, orders: Array.from({ length: 30000 }, (_, i) => ({ id: `RT-${90000 + i}`, createdAt: new Date().toISOString(), items })) })
  check('an impossibly large backup is refused clearly (413), not half-restored', r.status === 413, `${r.status}`)
  check('…and the previous data is still intact', sql('SELECT COUNT(*) AS n FROM orders')[0]?.n === 2500)
  void before
}
