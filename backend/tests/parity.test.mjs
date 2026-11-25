// Do the website's own checks agree with the server's?
// Rule 1: anything the website lets through, the server must accept too (no surprise error after pressing Save).
// Rule 2: obviously bad input is caught in the browser already (no round trip needed).
// The server stays the authority; this only proves the two lists have not drifted apart.
import fs from 'node:fs'
import path from 'node:path'
import { CATALOGUE, check, ctx, OWNER, ownerClient, section } from './helpers.mjs'

const V = await import(path.resolve(ctx().root, '..', 'frontend', 'src', 'lib', 'validation.ts'))
const sql = (command) => { const { persist, run } = ctx(); run(['d1', 'execute', 'raut-traders', '--local', '--persist-to', persist, '--command', command]) }
sql('DELETE FROM login_attempts')
const admin = await ownerClient()

section('Passwords and usernames: website vs server')
{
  let current = OWNER.pass
  let user = OWNER.user
  const tryPassword = async (pw) => {
    const client = V.validatePassword(pw, user)
    const r = await admin.post('/api/admin/credentials', { currentPassword: current, newUsername: user, newPassword: pw })
    if (r.status === 200) current = pw
    return { client, server: r.status === 200, status: r.status }
  }
  const good = ['Tr0ub4dor&3', 'purple-elephant-77', 'Marathi#Bazaar2026', 'a'.repeat(8) + 'Zq', 'Zq' + 'x'.repeat(198)]
  const bad = ['short', 'password', 'Password', 'admin1234', 'abc12345', '11111111', '1234567890', 'aaaaaaaa', 'x'.repeat(201), 'myadmin-Pass9', 'PASSWORD-is-bad', 'owner-secret-1', 'Owner2026!']
  for (const pw of good) {
    const r = await tryPassword(pw)
    check(`good password "${pw.slice(0, 18)}${pw.length > 18 ? '…' : ''}" (${pw.length} chars): website OK and server OK`, r.client === null && r.server, `website: ${r.client} | server: ${r.status}`)
  }
  for (const pw of bad) {
    const r = await tryPassword(pw)
    check(`bad password "${pw.slice(0, 18)}${pw.length > 18 ? '…' : ''}" (${pw.length} chars): refused by BOTH`, r.client !== null && !r.server, `website: ${r.client} | server: ${r.status}`)
  }
  await admin.post('/api/admin/credentials', { currentPassword: current, newUsername: user, newPassword: OWNER.pass })
  current = OWNER.pass

  for (const u of ['owner', 'shop.owner', 'a@b-c_d', 'x'.repeat(64), 'abc']) {
    const client = V.validateUsername(u)
    const r = await admin.post('/api/admin/credentials', { currentPassword: current, newUsername: u })
    check(`good username "${u.slice(0, 20)}": website OK and server OK`, client === null && r.status === 200, `website: ${client} | server: ${r.status} ${r.data?.error ?? ''}`)
    if (r.status === 200) user = u
  }
  for (const u of ['ab', 'has space', '<script>', 'x'.repeat(65), 'naïve', 'a/b', "o'brien"]) {
    const client = V.validateUsername(u)
    const r = await admin.post('/api/admin/credentials', { currentPassword: current, newUsername: u })
    check(`bad username "${u.slice(0, 20)}": refused by BOTH`, client !== null && r.status === 400, `website: ${client} | server: ${r.status}`)
  }
  await admin.post('/api/admin/credentials', { currentPassword: current, newUsername: OWNER.user })
}

section('E-mail address')
{
  for (const e of ['', 'a@b.co', 'shop.owner+bills@example.in', 'x@y.zz']) {
    const r = await admin.put('/api/admin/profile', { name: 'Owner', email: e })
    check(`good e-mail "${e}": website OK and server OK`, V.validateEmail(e) === null && r.status === 200, `${V.validateEmail(e)} | ${r.status}`)
  }
  for (const e of ['plain', 'a@b', '@b.com', 'a b@c.com', 'a@b.c<d', 'x'.repeat(201) + '@a.bc']) {
    const r = await admin.put('/api/admin/profile', { name: 'Owner', email: e })
    check(`bad e-mail "${e.slice(0, 22)}": refused by BOTH`, V.validateEmail(e) !== null && r.status === 400, `${V.validateEmail(e)} | ${r.status}`)
  }
}

section('Product form: website vs server')
{
  const save = (over) => { const c = structuredClone(CATALOGUE); c.products[0] = { ...c.products[0], ...over }; return admin.put('/api/admin/state', c) }
  const textCases = [
    ['name', 'Product name', 200, true], ['company', 'Brand', 120, false], ['size', 'Pack size', 60, false], ['description', 'Description', 1000, false],
  ]
  for (const [field, label, max, required] of textCases) {
    const okValue = 'x'.repeat(max)
    let r = await save({ [field]: okValue })
    check(`${label}: exactly ${max} characters is fine for both`, V.validateText(okValue, max, label, required) === null && r.status === 200, `${V.validateText(okValue, max, label, required)} | ${r.status}`)
    const tooLong = 'x'.repeat(max + 1)
    r = await save({ [field]: tooLong })
    check(`${label}: ${max + 1} characters is refused by BOTH`, V.validateText(tooLong, max, label, required) !== null && r.status === 400, `${V.validateText(tooLong, max, label, required)} | ${r.status}`)
    for (const [why, bad] of [['a NUL byte', 'a\u0000b'], ['a right-to-left override', 'a‮b']]) {
      r = await save({ [field]: bad })
      check(`${label}: ${why} is refused by BOTH`, V.validateText(bad, max, label, required) !== null && r.status === 400, `${V.validateText(bad, max, label, required)} | ${r.status}`)
    }
    for (const fine of ['बिस्किट', 'Biscuit 🍪', "Raut's \"special\" <b>x</b>"]) {
      r = await save({ [field]: fine })
      check(`${label}: "${fine}" is fine for both`, V.validateText(fine, max, label, required) === null && r.status === 200, `${V.validateText(fine, max, label, required)} | ${r.status}`)
    }
  }
  for (const [price, shouldPass] of [[0.01, true], [1, true], [9999999.99, true], [10_000_000, true], [10_000_001, false], [0, false], [-5, false], [Number.NaN, false], [Number.POSITIVE_INFINITY, false]]) {
    const client = V.validatePrice(price, 'Price')
    const r = await save({ price: Number.isFinite(price) ? price : 'abc' })
    const clientOk = client === null
    check(`price ${price}: website ${clientOk ? 'OK' : 'refuses'}, server ${r.status === 200 ? 'OK' : 'refuses'}  (a price the website accepts must never fail on the server)`, clientOk === shouldPass && (!clientOk || r.status === 200), `${client} | ${r.status}`)
  }
}

section('Pictures and files: website limits stay inside the server limits')
{
  check('the website\'s upload size target is below the server\'s 1.5 MB limit', V.MAX_UPLOAD_BYTES < 1_500_000, V.MAX_UPLOAD_BYTES)
  check('the price ceilings match (10,000,000)', V.MAX_PRICE === 10_000_000)
  check('SVG pictures are refused in the browser', V.validateImageFile({ type: 'image/svg+xml', size: 100 }) !== null)
  check('HTML / PDF / unknown files are refused as pictures', ['text/html', 'application/pdf', '', 'application/octet-stream'].every((t) => V.validateImageFile({ type: t, size: 100 }) !== null))
  check('PNG, JPEG, WebP and GIF are accepted as pictures', ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].every((t) => V.validateImageFile({ type: t, size: 100 }) === null))
  check('a 16 MB source picture is refused before decoding', V.validateImageFile({ type: 'image/png', size: 16 * 1024 * 1024 }) !== null)
  check('a picture that unpacks to 20 000 × 20 000 pixels is refused', V.validateImagePixels(20000, 20000) !== null)
  check('a normal 4000 × 3000 phone photo is accepted for editing', V.validateImagePixels(4000, 3000) === null)
  check('a backup must be a .json file under 25 MB', V.validateBackupFile({ name: 'x.png', size: 1 }) !== null && V.validateBackupFile({ name: 'a.json', size: 30 * 1024 * 1024 }) !== null && V.validateBackupFile({ name: 'a.json', size: 1000 }) === null)
  const b64 = 'data:image/webp;base64,' + 'A'.repeat(4000)
  check('the size helper measures the picture inside a data: URL', V.dataUrlBytes(b64) === 3000, V.dataUrlBytes(b64))
}

section('Generated ids stay inside the server\'s 80-character limit')
{
  const root = path.resolve(ctx().root, '..', 'frontend', 'src')
  const files = ['admin/pages/ProductsPage.tsx', 'admin/pages/CategoriesPage.tsx', 'store/seed.ts']
  for (const f of files) check(`${f}: the id generator cuts long names to 60 characters (the server refuses ids over 80)`, /\.slice\(0, 60\)/.test(fs.readFileSync(path.join(root, f), 'utf8')))
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'item'
  const longId = slug(`${'Brand '.repeat(30)}-${'Product '.repeat(40)}`) + '-12'
  const r = await admin.put('/api/admin/state', { ...structuredClone(CATALOGUE), products: [{ ...CATALOGUE.products[0], id: longId }] })
  check('a product with a very long brand + name still saves (id length ' + longId.length + ')', r.status === 200 && longId.length <= 80, r.status)
  check('a name with no Latin letters (e.g. Hindi) still gets a valid id', /^[a-z0-9-]+$/.test(slug('बिस्किट')))
  await admin.put('/api/admin/state', CATALOGUE)
}
