// Second pass over HTTPS: transport security and cross-origin behaviour only exist on secure connections.
import { check, Client, OWNER, SEED, SITE, section } from './helpers.mjs'

section('HTTPS: transport security')
const c = new Client()
let r = await c.login(OWNER.user, OWNER.pass)
if (r.status !== 200) r = await c.login(SEED.user, SEED.pass)
check('sign-in works over HTTPS and returns a token', r.status === 200 && /^[0-9a-f]{64}$/.test(r.data?.token ?? ''), `${r.status} ${JSON.stringify(r.data)}`)
check('…and no cookie is ever set', !r.setCookie, r.setCookie ?? '')
r = await c.get('/api/admin/me', { headers: { Origin: SITE } })
check('the token is accepted from the website origin', r.status === 200, r.status)
check('API sends Strict-Transport-Security', /max-age=\d{7,}/.test(r.headers.get('strict-transport-security') ?? ''), r.headers.get('strict-transport-security'))
check('the allowed website origin is echoed exactly (not "*")', r.headers.get('access-control-allow-origin') === SITE, r.headers.get('access-control-allow-origin'))
r = await c.call('OPTIONS', '/api/admin/state', undefined, { noAuth: true, headers: { Origin: SITE, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } })
check('pre-flight over HTTPS is answered (204)', r.status === 204, r.status)
r = await c.post('/api/admin/logout', {}, { headers: { Origin: SITE } })
check('logout works', r.status === 200)
r = await c.get('/api/admin/me')
check('…and the session is gone', r.status === 401, r.status)
