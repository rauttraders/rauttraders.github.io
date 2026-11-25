export interface Env {
  /** D1 (SQLite) database — holds everything. */
  DB: D1Database
  SITE_NAME: string
  /** Comma-separated list of website addresses allowed to call this API, e.g. "https://you.github.io". */
  ALLOWED_ORIGINS?: string
  /** Cloudflare rate limiters (see "ratelimits" in wrangler.jsonc). */
  GLOBAL_LIMITER?: RateLimit
  LOGIN_LIMITER?: RateLimit
  UPLOADS_LIMITER?: RateLimit
  /** Secrets: only used to create the very first admin when the admins table is empty. */
  ADMIN_USER?: string
  ADMIN_PASSWORD?: string
  /** Long random secret mixed into every password hash. Lives only as a Worker secret, never in the database. */
  PASSWORD_PEPPER?: string
  /** PBKDF2 iterations. Default 5 000 (fits the free plan's CPU limit); up to 100 000 on a paid plan. */
  PBKDF2_ITERATIONS?: string
}

export interface AdminRow {
  id: number
  username: string
  password_hash: string
  must_change: number
  name: string
  email: string
  photo: string
}

export type AppEnv = { Bindings: Env; Variables: { admin: AdminRow } }
