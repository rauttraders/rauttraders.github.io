import type { MiddlewareHandler } from 'hono'
import type { AppEnv, Env } from '../env'

/**
 * The website (GitHub Pages) and this API (Cloudflare) are different origins, so the browser only lets the site talk to
 * the API if the API says so. We say so for an exact allow-list of origins (ALLOWED_ORIGINS in wrangler.jsonc), never "*".
 *
 * No cookies are used (the admin session is a token sent in the Authorization header), so credentials are not allowed
 * (`Access-Control-Allow-Credentials` is never sent) and a malicious site cannot ride on the admin's login.
 */
export function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean))
}

export const isAllowedOrigin = (env: Env, origin: string | undefined | null): boolean => !!origin && allowedOrigins(env).has(origin)

const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
  'Access-Control-Expose-Headers': 'Retry-After, Idempotent-Replayed',
  'Access-Control-Max-Age': '600',
  Vary: 'Origin',
})

export const cors: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header('Origin')
  const allowed = isAllowedOrigin(c.env, origin)

  if (c.req.method === 'OPTIONS') {
    // A browser "pre-flight" question: may this page make this request? Only for our own site.
    return origin && allowed ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : new Response(null, { status: 403 })
  }

  await next()
  // Answers can come from the edge cache with read-only headers, so work on a copy.
  c.res = new Response(c.res.body, c.res)
  c.res.headers.append('Vary', 'Origin')
  if (origin && allowed) for (const [k, v] of Object.entries(corsHeaders(origin))) if (k !== 'Vary') c.res.headers.set(k, v)
}
