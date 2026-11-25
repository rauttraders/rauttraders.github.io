import { Hono } from 'hono'
import { purgeUnusedImages } from './db/images'
import { purgeExpired } from './db/limits'
import type { AppEnv, Env } from './env'
import { HttpError } from './lib/http'
import { rateLimit } from './middleware/limits'
import { cors } from './middleware/cors'
import { securityHeaders } from './middleware/security'
import { adminRoutes } from './routes/admin'
import { publicRoutes, uploadsRoutes } from './routes/public'
import { publicContactRoutes, adminContactRoutes } from './routes/contacts'

/**
 * The Raut Traders API (Cloudflare Worker). The shop website itself is a static site hosted on GitHub Pages and talks to
 * this API across origins (see middleware/cors.ts):
 *   /api/*      the JSON API (public catalogue, orders, admin)
 *   /uploads/*  pictures stored in the database
 */
const app = new Hono<AppEnv>()

app.use('*', securityHeaders)
app.use('*', cors) // answers the browser's pre-flight questions and adds the allow-origin headers; runs before the limiter so even a 429 can be read by the site
app.use('/api/*', rateLimit((e) => e.GLOBAL_LIMITER))

app.get('/', (c) => c.json({ ok: true, name: c.env.SITE_NAME, message: 'This is the shop API. The website is hosted separately.' }))
app.route('/api', publicRoutes)
app.route('/api', publicContactRoutes)        // POST /api/contact — public, rate-limited
app.route('/api/admin', adminRoutes)
app.route('/api/admin', adminContactRoutes)   // GET /api/admin/contacts etc — behind requireAdmin
app.route('/uploads', uploadsRoutes)

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400)
  console.error(err)
  return c.json({ error: 'Server error' }, 500)
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))

export default {
  fetch: app.fetch,
  // Daily clean-up (cron trigger in wrangler.jsonc): expired sessions, old rate-limit rows, unused images.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([purgeExpired(env.DB), purgeUnusedImages(env.DB)]))
  },
} satisfies ExportedHandler<Env>
