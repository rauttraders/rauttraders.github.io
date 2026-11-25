import { randomHex, sha256Hex } from '../lib/crypto'
import type { AdminRow } from '../env'

export const SESSION_MS = 7 * 24 * 3600 * 1000

/** Creates a session and returns the secret token for the cookie. Only its SHA-256 is stored. */
export async function createSession(db: D1Database, adminId: number): Promise<string> {
  const token = randomHex(32)
  const now = Date.now()
  await db.prepare('INSERT INTO sessions (id, admin_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(await sha256Hex(token), adminId, now, now + SESSION_MS).run()
  return token
}

export async function findSessionAdmin(db: D1Database, token: string): Promise<AdminRow | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  return db
    .prepare('SELECT a.* FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.id = ?1 AND s.expires_at > ?2')
    .bind(await sha256Hex(token), Date.now())
    .first<AdminRow>()
}

export async function endSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256Hex(token)).run()
}

/** After a password change: sign the admin out everywhere except on the device that made the change. */
export async function endOtherSessions(db: D1Database, adminId: number, keepToken: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE admin_id = ?1 AND id != ?2').bind(adminId, await sha256Hex(keepToken)).run()
}
