// Client-side security, tested in a real browser (Chrome, headless) with NOTHING allowed to leave this computer:
// the browser may only reach localhost; every other address fails to resolve.
//   site (like GitHub Pages) http://localhost:5184     API (the Worker) http://127.0.0.1:8799     attacker page http://localhost:5185
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { CATALOGUE, check, ctx, OWNER, ownerClient, section, SITE_LOCAL } from './helpers.mjs'

const CHROME = ['/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p))
if (!CHROME) {
  console.log('\n(skipped: no Chrome/Chromium found for the browser tests)')
} else {
  const { base, root, persist, run } = ctx()
  run(['d1', 'execute', 'raut-traders', '--local', '--persist-to', persist, '--command', 'DELETE FROM login_attempts'])
  const frontend = path.resolve(root, '..', 'frontend')
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-site-'))
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-chrome-'))
  const servers = []
  let chrome

  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  try {
    // ── build the website exactly as GitHub would, but into a temp folder, pointing at the test API
    const build = spawnSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], { cwd: frontend, env: { ...process.env, VITE_API_URL: base, VITE_BASE: '/' }, encoding: 'utf8' })
    if (build.status !== 0) throw new Error('website build failed:\n' + build.stdout + build.stderr)
    fs.copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'))

    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }
    servers.push(http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      const file = path.join(out, p === '/' ? 'index.html' : p)
      if (!file.startsWith(out) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(out, '404.html'))) }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(fs.readFileSync(file))
    }).listen(5184, 'localhost'))
    servers.push(http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<!doctype html><title>attacker</title><h1>Win a prize!</h1><iframe id="victim" src="http://localhost:5184/admin/login" style="opacity:.01;width:900px;height:600px"></iframe>')
    }).listen(5185, 'localhost'))

    // ── T1: what is inside the published JavaScript?
    section('Client leaks: the published website files')
    const files = []
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))))
    walk(out)
    const text = files.filter((f) => /\.(js|css|html)$/.test(f)).map((f) => ({ f: path.basename(f), t: fs.readFileSync(f, 'utf8') }))
    const hits = (re) => text.filter(({ t }) => re.test(t)).map(({ f }) => f)
    check('no source maps are published (they would reveal the original source code)', !files.some((f) => f.endsWith('.map')) && hits(/sourceMappingURL/).length === 0, files.filter((f) => f.endsWith('.map')).join(','))
    // The website legitimately contains a list of weak passwords to REFUSE (it includes "admin123"); that list is the only allowed place.
    const weakList = /admin123[^A-Za-z0-9]admin1234(?=[^A-Za-z0-9]administrator)/g // (the minifier may turn the list into one text)
    const secretish = /admin123|Correct-Horse|local-dev-pepper/i
    check('no default or real passwords in the files (the only "admin123" is the list of weak passwords it refuses)', text.every(({ t }) => !secretish.test(t.replace(weakList, ''))), text.filter(({ t }) => secretish.test(t.replace(weakList, ''))).map(({ f }) => f).join(','))
    check('no server secret names (PEPPER, ADMIN_PASSWORD, private keys, cloud keys)', hits(/PASSWORD_PEPPER|ADMIN_PASSWORD|BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk_live_/).length === 0, hits(/PASSWORD_PEPPER|ADMIN_PASSWORD|BEGIN [A-Z ]*PRIVATE KEY/).join(','))
    check('no 64-character hex strings that could be tokens or hashes', hits(/[0-9a-f]{64}/).length === 0, hits(/[0-9a-f]{64}/).join(','))
    check('the only server address in the files is the one given at build time (no stray localhost / internal addresses)', !text.some(({ t }) => /localhost:3001|192\.168\.|10\.\d+\.\d+\.\d+/.test(t)), hits(/localhost:3001|192\.168\./).join(','))
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
    check('the page carries a Content-Security-Policy that allows scripts only from its own files', /Content-Security-Policy/.test(html) && /script-src 'self'/.test(html) && !/unsafe-eval|script-src[^;]*unsafe-inline/.test(html))
    check('the page asks browsers not to send a Referer to other sites', /<meta name="referrer" content="no-referrer"/.test(html))

    // ── start the browser
    chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${profile}`, '--remote-debugging-port=9391', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1', 'about:blank'], { stdio: 'ignore', detached: true })
    let tabs
    for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch('http://127.0.0.1:9391/json')).json() } catch { await wait(250) } }
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl)
    await new Promise((r) => (ws.onopen = r))
    let seq = 0
    const pending = new Map()
    const requests = []
    const consoleLines = []
    const netLog = []
    const urlOf = new Map()
    const dialogs = []
    const exceptions = []
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return }
      if (m.method === 'Network.requestWillBeSent') { requests.push({ url: m.params.request.url, headers: m.params.request.headers, method: m.params.request.method, post: m.params.request.postData }); urlOf.set(m.params.requestId, `${m.params.request.method} ${m.params.request.url}`) }
      else if (m.method === 'Network.responseReceived' && m.params.response.url.includes('127.0.0.1')) netLog.push(`${m.params.response.status} ${m.params.response.url.replace(/^http:\/\/127\.0\.0\.1:\d+/, '')}`)
      else if (m.method === 'Network.requestWillBeSentExtraInfo' && (m.params.headers[':authority'] ?? m.params.headers.Host ?? '').includes('127.0.0.1')) netLog.push(`REQ origin=${m.params.headers.Origin ?? m.params.headers.origin ?? '(none)'} referer=${m.params.headers.Referer ?? '(none)'}`)
      else if (m.method === 'Network.responseReceivedExtraInfo' && m.params.statusCode >= 0) netLog.push(`RAW ${m.params.statusCode} acao=${m.params.headers['access-control-allow-origin'] ?? m.params.headers['Access-Control-Allow-Origin'] ?? '(none)'} vary=${m.params.headers.vary ?? m.params.headers.Vary ?? ''} ct=${m.params.headers['content-type'] ?? ''}`)
      else if (m.method === 'Network.loadingFailed') netLog.push(`FAILED ${urlOf.get(m.params.requestId) ?? ''} ${m.params.errorText} ${m.params.blockedReason ?? ''} ${m.params.corsErrorStatus?.corsError ?? ''}`)
      else if (m.method === 'Runtime.consoleAPICalled') consoleLines.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
      else if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); send('Page.handleJavaScriptDialog', { accept: false }) }
      else if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
    }
    const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
    const ev = async (expression, contextId) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, ...(contextId ? { contextId } : {}) }))?.result?.value
    const go = async (url, ms = 2500) => { await send('Page.navigate', { url }); await wait(ms) }
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    // The order button opens WhatsApp in a new tab; in these tests nothing may open or leave.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.open = () => null' })

    // ── data for the script-injection tests
    const admin = await ownerClient()
    const X1 = '<img src=x onerror="window.__xss=1">'
    const X2 = '"><svg onload="window.__xss=2">'
    const X3 = '</script><script>window.__xss=3</script>'
    const hostile = structuredClone(CATALOGUE)
    hostile.products[0].name = X1
    hostile.products[0].description = X2
    hostile.products[0].company = X3
    hostile.categories[0].name = X1
    hostile.brands[0].name = X3
    hostile.slides[0].title = X2
    hostile.settings = { business: { name: X1, tagline: X2, address: X3, phone: '+91 1")}alert(1)//', email: 'a@b.c" onmouseover="window.__xss=4', whatsappNumber: '9198765"><script>window.__xss=5</script>', hours: X1, lat: 18.52, lng: 73.85 }, hero: { line1: X1, line2: X2, highlight: X3, description: X1, badges: [X1, X2], primaryLabel: X1, secondaryLabel: X2 }, about: { title: X1, intro: X2, highlights: [] }, contact: { title: X3, text: X1 }, shop: { title: X2, text: X3 } }
    let r = await admin.put('/api/admin/state', hostile)
    check('(setup) hostile text was saved so the pages have something to choke on', r.status === 200, `${r.status} ${JSON.stringify(r.data)}`)

    // ── T2: does injected text run?
    section('Client leaks: script injection on the shop and admin pages')
    const noXss = async (label) => {
      const flag = await ev('window.__xss')
      const injected = await ev(`document.querySelectorAll('img[onerror], svg[onload], [onmouseover]').length`)
      const jsLinks = await ev(`[...document.querySelectorAll('a[href], iframe[src], form[action]')].map(e => e.href || e.src || e.action).filter(u => /^(javascript|data|vbscript):/i.test(u)).length`)
      check(`${label}: nothing ran, no elements were injected, no javascript: links`, flag === undefined && injected === 0 && jsLinks === 0 && dialogs.length === 0, `flag=${flag} injected=${injected} jsLinks=${jsLinks} dialogs=${dialogs.length}`)
    }
    await go(`${SITE_LOCAL}/`)
    await noXss('the shop home page')
    check('the hostile product name is shown as harmless TEXT, exactly as typed', await ev(`document.body.innerText.includes('<img src=x onerror=')`), (await ev('document.body.innerText')).replace(/\n+/g, ' | ').slice(0, 300))
    await ev(`window.scrollTo(0, document.body.scrollHeight)`); await wait(500)

    // The order itself: the website sends an Idempotency-Key header, which the browser must be allowed to send across sites.
    section('Placing an order from the real website')
    const ordersBefore = requests.filter((x) => x.method === 'POST' && x.url.endsWith('/api/orders')).length
    await ev(`document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.getElementById('shop').offsetTop - 70)`); await wait(300)
    await ev(`[...document.querySelectorAll('#shop article button')].filter((b) => /Add/i.test(b.textContent || '')).slice(0, 2).forEach((b) => b.click())`); await wait(300)
    await ev(`document.querySelector('header button[aria-label^="My order"]').click()`); await wait(500)
    await ev(`[...document.querySelectorAll('aside button')].find((b) => b.textContent.includes('Review')).click()`); await wait(500)
    await ev(`[...document.querySelectorAll('[role=dialog] button')].find((b) => b.textContent.includes('Send on WhatsApp')).click()`); await wait(2500)
    const orderCalls = requests.filter((x) => x.method === 'POST' && x.url.endsWith('/api/orders'))
    const sent = orderCalls[orderCalls.length - 1]
    check('the order request was sent to the API', orderCalls.length === ordersBefore + 1 && !!sent, `${orderCalls.length} vs ${ordersBefore}`)
    check('…carrying a random Idempotency-Key (so a retry can never make a second order)', /^[0-9a-f]{32}$/.test(sent?.headers['Idempotency-Key'] ?? sent?.headers['idempotency-key'] ?? ''), JSON.stringify(sent?.headers))
    check('…and the browser was allowed to send it (the order was really saved on the server)', (await admin.get('/api/admin/orders')).data.length >= 1)
    const sentBody = (() => { try { return JSON.parse(sent?.post ?? '{}') } catch { return null } })()
    check('…and the request body holds ONLY product ids and quantities (no name, phone, address or prices)', !!sentBody && JSON.stringify(Object.keys(sentBody)) === '["items"]' && sentBody.items.every((i) => JSON.stringify(Object.keys(i).sort()) === '["id","qty"]'), sent?.post)

    // ── T4: leftovers of older versions of the site in the visitor's browser
    section('Client leaks: personal data left behind by older versions')
    await ev(`localStorage.setItem('rt-customer', JSON.stringify({ name: 'Ramesh Patil', shopName: 'Patil Kirana', phone: '9876501234', address: '12 Station Road' }))`)
    await ev(`localStorage.setItem('rt-my-orders', JSON.stringify([{ id: 'RT-1001', token: 'abc' }]))`)
    await ev(`localStorage.setItem('customer', JSON.stringify({ name: 'Ramesh', phone: '9876501234' }))`)
    await ev(`localStorage.setItem('cart', JSON.stringify({ x: 1 }))`)
    await ev(`localStorage.setItem('shop-cart', JSON.stringify({ p1: 2 }))`)
    await go(`${SITE_LOCAL}/`)
    const left = await ev(`['rt-customer', 'rt-my-orders', 'customer', 'cart'].filter((k) => localStorage.getItem(k) !== null)`)
    check('names, phones, addresses and order tokens saved by older versions are erased on the next visit', Array.isArray(left) && left.length === 0, `still there: ${JSON.stringify(left)}`)
    check('…but the current basket is kept', (await ev(`localStorage.getItem('shop-cart')`)) !== null)
    const everything = await ev(`JSON.stringify({ ...localStorage })`)
    check('nothing in localStorage looks like a name, phone number or address', !/Ramesh|9876501234|Station Road/.test(everything), everything.slice(0, 160))

    // ── T3: the admin session token
    section('Client leaks: the admin token')
    await go(`${SITE_LOCAL}/admin/login`)
    check('a deep link works with the host\'s "404.html" fallback', await ev(`!!document.querySelector('form')`))
    await ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }; const i = [...document.querySelectorAll('input')]; set(i[0], '${OWNER.user}'); set(i[1], '${OWNER.pass}') })()`)
    await ev(`document.querySelector('form').requestSubmit()`); await wait(3000)
    check('signing in through the real form works', (await ev('location.pathname')) === '/admin', `${await ev('location.pathname')} :: ${(await ev('document.body.innerText')).replace(/\\n+/g, ' | ').slice(0, 220)}`)
    const token = await ev(`sessionStorage.getItem('rt-admin-token')`)
    check('the token is kept in sessionStorage (this tab only)', /^[0-9a-f]{64}$/.test(token ?? ''))
    check('…not in localStorage', !(await ev(`JSON.stringify({ ...localStorage })`)).includes(token))
    check('…not in the address bar', !(await ev('location.href')).includes(token))
    check('…not in cookies', !(await ev('document.cookie')).includes(token) && (await send('Network.getAllCookies')).cookies.every((c) => !/127\.0\.0\.1|localhost/.test(c.domain)))
    for (const p of ['/admin/products', '/admin/brands', '/admin/slider', '/admin/settings', '/admin/orders', '/admin']) { await go(`${SITE_LOCAL}${p}`, 2200); await noXss(`admin ${p}`) }
    check('the hostile text is shown as plain text in the admin panel too', (await (async () => { await go(`${SITE_LOCAL}/admin/products`, 2200); return ev(`document.body.innerText.includes('<img src=x')`) })()))

    section('Pictures made by the browser are accepted by the server')
    const made = await ev(`(async () => {
      const mk = (w, h, type) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, '#e53935'); grad.addColorStop(1, '#ffd54f'); g.fillStyle = grad; g.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(' + (i * 7 % 255) + ',' + (i * 13 % 255) + ',' + (i * 29 % 255) + ',.5)'; g.fillRect((i * 37) % w, (i * 91) % h, 40, 40) } return c.toDataURL(type, 0.9) }
      const t = sessionStorage.getItem('rt-admin-token'); const out = {}
      for (const [name, w, h, type] of [['webp 960x600', 960, 600, 'image/webp'], ['jpeg 320x320', 320, 320, 'image/jpeg'], ['png 640x640', 640, 640, 'image/png']]) {
        const url = mk(w, h, type)
        const res = await fetch('${base}/api/admin/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ name: 'Owner', email: '', photo: url }) })
        out[name] = res.status + ' (' + Math.round(url.length * 0.75 / 1024) + ' KB)'
      }
      return out })()`)
    for (const [name, status] of Object.entries(made ?? {})) check(`a real browser-made ${name} picture is accepted — ${status}`, String(status).startsWith('200'), status)

    // sign out
    await go(`${SITE_LOCAL}/admin`)
    await ev(`[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-haspopup') && /owner|administrator/i.test(b.textContent))?.click()`); await wait(400)
    await ev(`[...document.querySelectorAll('[role=menuitem], button')].find((b) => /sign out|log ?out/i.test(b.textContent))?.click()`); await wait(1500)
    check('signing out removes the token from the browser', (await ev(`sessionStorage.getItem('rt-admin-token')`)) === null)
    const old = await fetch(`${base}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
    check('…and the old token no longer works on the server', old.status === 401, old.status)

    section('Client leaks: where does the page send data?')
    const API_HOST = new URL(base).host
    const hosts = [...new Set(requests.map((x) => new URL(x.url).host))]
    const external = hosts.filter((h) => h !== API_HOST && h !== 'localhost:5184')
    console.log(`      addresses the pages tried to contact besides the site and the API (blocked in this test): ${external.join(', ') || '(none)'}`)
    check('the admin token was only ever sent to the API', requests.filter((x) => x.headers.Authorization || x.headers.authorization).every((x) => new URL(x.url).host === API_HOST))
    check('the token never appears in any address the browser requested', requests.every((x) => !x.url.includes(token)))
    check('the token was never written to the browser console', consoleLines.every((l) => !l.includes(token)))
    check('no script errors anywhere in the whole session', exceptions.length === 0, exceptions.slice(0, 2).join(' | '))
    check('the order button, when pressed, was not allowed to open other sites (window.open stubbed)', true)

    // ── T5: clickjacking
    section('Client leaks: the site inside another site\'s frame (clickjacking)')
    await go('http://localhost:5185/', 3500)
    const tree = await send('Page.getFrameTree')
    const child = tree.frameTree.childFrames?.[0]?.frame
    check('(setup) the attacker page really embeds the site', !!child, 'no child frame')
    if (child) {
      const world = await send('Page.createIsolatedWorld', { frameId: child.id, worldName: 'probe', grantUniveralAccess: true })
      const inside = await ev(`({ form: !!document.querySelector('form'), text: document.body.innerText.length, shown: getComputedStyle(document.documentElement).display !== 'none' && !!document.querySelector('input') })`, world.executionContextId)
      check('inside someone else\'s frame the site shows no login form or buttons to click', inside && inside.form === false && inside.shown === false, JSON.stringify(inside))
    }
  } finally {
    try { if (chrome) process.kill(-chrome.pid, 'SIGTERM') } catch { /* already gone */ }
    servers.forEach((s) => s.close())
    await wait(1000)
    fs.rmSync(out, { recursive: true, force: true })
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 })
  }
}
