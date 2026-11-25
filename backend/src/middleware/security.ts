import type { Context, MiddlewareHandler } from 'hono'
import { findSessionAdmin } from '../db/sessions'
import type { AppEnv } from '../env'
import { HttpError } from '../lib/http'
import { isAllowedOrigin } from './cors'

export const isHttps = (url: string): boolean => new URL(url).protocol === 'https:'
export const isLocalHost = (url: string): boolean => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(url).hostname)

/** Headers for everything the Worker produces. (The website itself is served by GitHub Pages, which sets its own.) */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next()
  // Responses that come out of the Cache API have read-only headers, so work on a copy.
  c.res = new Response(c.res.body, c.res)
  const h = c.res.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('Referrer-Policy', 'no-referrer')
  h.set('X-Frame-Options', 'DENY')
  if (!h.has('Content-Security-Policy')) h.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  if (isHttps(c.req.url)) h.set('Strict-Transport-Security', 'max-age=31536000')
  if (!h.has('Cache-Control')) h.set('Cache-Control', 'no-store')
}

/** The admin session is a random 256-bit token sent as `Authorization: Bearer <token>` — never a cookie. */
export const bearerToken = (c: Context<AppEnv>): string | null => /^Bearer ([0-9a-f]{64})$/.exec(c.req.header('Authorization') ?? '')?.[1] ?? null

/** While the admin still has the first (temporary) password, only changing it and signing out are allowed. */
const ALLOWED_BEFORE_PASSWORD_CHANGE = new Set(['/api/admin/credentials', '/api/admin/logout'])

/** A browser always says which site a request comes from. If it names a site that is not ours, refuse (non-browser tools send no Origin). */
export function assertOriginAllowed(c: Context<AppEnv>): void {
  const origin = c.req.header('Origin')
  if (origin && !isAllowedOrigin(c.env, origin)) throw new HttpError(403, 'This site is not allowed to use the API.')
}

/**
 * Guards every /api/admin route:
 *  - needs a valid session token (looked up, hashed, in the database);
 *  - for anything that changes data: JSON content type AND an allowed Origin (defence in depth — with header tokens
 *    and no cookies there is no ambient login for another site to abuse);
 *  - while `must_change` is set, data can be read but not changed until the password has been replaced.
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearerToken(c)
  const admin = token ? await findSessionAdmin(c.env.DB, token) : null
  if (!admin) throw new HttpError(401, 'Please sign in')
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    if (!(c.req.header('Content-Type') ?? '').includes('application/json')) throw new HttpError(415, 'JSON required')
    assertOriginAllowed(c)
    if (admin.must_change && !ALLOWED_BEFORE_PASSWORD_CHANGE.has(c.req.path)) throw new HttpError(403, 'Please choose a new password first (Admin → My account).')
  }
  c.set('admin', admin)
  await next()
}

export const clientIp = (c: { req: { header: (n: string) => string | undefined } }): string => c.req.header('CF-Connecting-IP') ?? 'local'
