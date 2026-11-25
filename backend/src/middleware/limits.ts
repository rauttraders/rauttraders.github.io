import type { MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { AppEnv, Env } from '../env'
import { HttpError } from '../lib/http'
import { clientIp } from './security'

/**
 * Cheap first line of defence using Cloudflare's built-in rate limiter (no database writes, so a flood cannot use up the
 * free plan's daily write quota). It counts per visitor address; the exact limits are in wrangler.jsonc.
 * If a limiter binding is missing the request is let through (the database-backed limits further in still apply).
 */
export const rateLimit = (pick: (env: Env) => RateLimit | undefined): MiddlewareHandler<AppEnv> => async (c, next) => {
  const limiter = pick(c.env)
  if (limiter) {
    const { success } = await limiter.limit({ key: clientIp(c) })
    if (!success) {
      c.header('Retry-After', '30')
      throw new HttpError(429, 'Too many requests. Please slow down and try again in a moment.')
    }
  }
  await next()
}

/** Refuses a request body bigger than `maxBytes` (413) before it is read into memory. */
export const maxBody = (maxBytes: number): MiddlewareHandler<AppEnv> =>
  bodyLimit({ maxSize: maxBytes, onError: (c) => c.json({ error: 'That request is too large.' }, 413) })

export const KB = 1024
export const MB = 1024 * 1024
