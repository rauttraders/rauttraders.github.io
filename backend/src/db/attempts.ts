import { HttpError } from '../lib/http'

/**
 * Brute-force guard, kept in the database so it works across Cloudflare's many machines and survives restarts.
 * Three independent counters are used at sign-in (see routes/admin):
 *   ui:<user>|<ip>  5 failures   one visitor guessing one account
 *   ip:<ip>         20 failures  one visitor trying many accounts
 *   user:<user>     30 failures  many visitors attacking one account (a botnet)
 * The per-visitor counter stops a normal attacker long before the per-account one, so an attacker cannot easily lock the
 * real owner out from somewhere else.
 */
const WINDOW_MS = 15 * 60_000
const LOCK_MS = 15 * 60_000

export async function assertNotLocked(db: D1Database, keys: string[]): Promise<void> {
  const now = Date.now()
  const marks = keys.map((_, i) => `?${i + 1}`).join(',')
  const rows = (await db.prepare(`SELECT MAX(locked_until) AS until FROM login_attempts WHERE key IN (${marks})`).bind(...keys).first<{ until: number | null }>())?.until ?? 0
  if (rows > now) throw new HttpError(429, `Too many failed attempts. Try again in ${Math.ceil((rows - now) / 60_000)} minute(s).`)
}

/** Records one failure. Returns true when this failure started a lock. */
export async function registerFailure(db: D1Database, key: string, max: number): Promise<boolean> {
  const now = Date.now()
  const r = await db
    .prepare(
      `INSERT INTO login_attempts (key, fails, window_start, locked_until) VALUES (?1, 1, ?2, CASE WHEN 1 >= ?4 THEN ?2 + ?5 ELSE 0 END)
       ON CONFLICT(key) DO UPDATE SET
         fails = CASE WHEN ?2 - window_start > ?3 THEN 1 ELSE fails + 1 END,
         window_start = CASE WHEN ?2 - window_start > ?3 THEN ?2 ELSE window_start END,
         locked_until = CASE WHEN (CASE WHEN ?2 - window_start > ?3 THEN 1 ELSE fails + 1 END) >= ?4 THEN ?2 + ?5 ELSE locked_until END
       RETURNING locked_until`,
    )
    .bind(key, now, WINDOW_MS, max, LOCK_MS)
    .first<{ locked_until: number }>()
  return (r?.locked_until ?? 0) > now
}

export async function clearAttempts(db: D1Database, keys: string[]): Promise<void> {
  await db.batch(keys.map((k) => db.prepare('DELETE FROM login_attempts WHERE key = ?1').bind(k)))
}
