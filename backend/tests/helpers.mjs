// Tiny test toolkit (no dependencies): HTTP helper with a cookie jar, spoofable client IP, and a pass/fail counter.
export const state = { pass: 0, fail: 0, failures: [] }

/** The website's address as far as the API is concerned (the runner passes it as ALLOWED_ORIGINS). */
export const SITE = 'https://shop.example.test'
export const EVIL = 'https://evil.example'
/** The website as served to the real-browser tests (see browser.test.mjs). */
export const SITE_LOCAL = 'http://localhost:5184'

export function ctx() {
  return globalThis.TEST_CTX
}

export function check(name, cond, extra = '') {
  if (cond) state.pass++
  else {
    state.fail++
    state.failures.push(`${name}${extra ? '  → ' + extra : ''}`)
  }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : '  → ' + extra}`)
}

export const section = (title) => console.log(`\n── ${title}`)

/** In local development the Worker trusts CF-Connecting-IP from the client, so tests can pretend to be different visitors. */
let ipCounter = 0
export const freshIp = () => `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${++ipCounter & 255}`

export class Client {
  constructor(ip = freshIp()) {
    this.ip = ip
    this.token = ''
  }

  async call(method, path, body, opts = {}) {
    const { base } = ctx()
    const headers = { 'CF-Connecting-IP': opts.ip ?? this.ip, ...(opts.headers || {}) }
    const isRaw = typeof body === 'string' || body instanceof Uint8Array
    if (body !== undefined && !('Content-Type' in headers) && !isRaw) headers['Content-Type'] = 'application/json'
    if (opts.json && !('Content-Type' in headers)) headers['Content-Type'] = 'application/json'
    if (this.token && !opts.noAuth) headers.Authorization = `Bearer ${this.token}`
    const send = () => fetch(base + path, { method, headers, body: body === undefined ? undefined : isRaw ? body : JSON.stringify(body), redirect: 'manual' })
    // After the server refuses a huge upload it closes that connection; if the client reuses it once, just try again.
    const res = await send().catch(() => send())
    const set = res.headers.get('set-cookie')
    const type = res.headers.get('content-type') || ''
    const data = type.includes('json') ? await res.json().catch(() => null) : Buffer.from(await res.arrayBuffer())
    if (!opts.noAuth && data && typeof data === 'object' && typeof data.token === 'string') this.token = data.token
    if (!opts.noAuth && path.endsWith('/logout') && res.status === 200) this.token = ''
    return { status: res.status, data, headers: res.headers, setCookie: set }
  }

  get(path, opts) { return this.call('GET', path, undefined, opts) }
  post(path, body, opts) { return this.call('POST', path, body, { json: true, ...opts }) }
  put(path, body, opts) { return this.call('PUT', path, body, { json: true, ...opts }) }
  del(path, opts) { return this.call('DELETE', path, undefined, { json: true, ...opts }) }

  login(user, pass) { return this.post('/api/admin/login', { user, pass }) }
}

export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export const OWNER = { user: 'owner', pass: 'Correct-Horse-91' }
export const SEED = { user: 'admin', pass: 'admin123' } // from .dev.vars: creates the first admin on first sign-in

/** A signed-in admin client. Creates the first admin and moves it to OWNER credentials the first time it is called. */
export async function ownerClient() {
  const c = new Client()
  let r = await c.login(OWNER.user, OWNER.pass)
  if (r.status === 200) return c
  r = await c.login(SEED.user, SEED.pass)
  if (r.status !== 200) throw new Error(`cannot sign in as the seed admin: ${r.status} ${JSON.stringify(r.data)}`)
  r = await c.post('/api/admin/credentials', { currentPassword: SEED.pass, newUsername: OWNER.user, newPassword: OWNER.pass })
  if (r.status !== 200) throw new Error(`cannot set owner credentials: ${r.status} ${JSON.stringify(r.data)}`)
  return c
}

export const CATALOGUE = {
  products: [
    { id: 'p1', name: 'Marie Gold', company: 'Britannia', categoryId: 'biscuits', description: 'Tea biscuit', size: '250 g', price: 30, mrp: 35, image: '', active: true },
    { id: 'p2', name: 'Hidden', company: 'X', categoryId: 'biscuits', description: '', size: '1 pc', price: 5, image: '', active: false },
    { id: 'p3', name: 'Namkeen', company: 'Gopal', categoryId: 'snacks', description: '', size: '200 g', price: 40, image: 'asset:p3', active: true },
  ],
  categories: [{ id: 'biscuits', name: 'Biscuits' }, { id: 'snacks', name: 'Snacks' }],
  brands: [{ id: 'b1', name: 'Britannia', logo: '' }],
  slides: [{ id: 's1', title: 'One', image: '', scale: 1 }],
  settings: { business: { name: "Raut Trader's" }, hero: { secondaryLabel: 'My order' } },
}
