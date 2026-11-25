import type { D1Database } from '@cloudflare/workers-types'

export interface ContactMessage {
  id: number
  createdAt: string
  name: string
  shopName: string
  phone: string
  message: string
  read: boolean
  archived: boolean
}

interface ContactRow {
  id: number
  created_at: string
  name: string
  shop_name: string
  phone: string
  message: string
  read: number
  archived: number
}

function toMessage(r: ContactRow): ContactMessage {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    shopName: r.shop_name,
    phone: r.phone,
    message: r.message,
    read: !!r.read,
    archived: !!r.archived,
  }
}

/** Insert a new contact message submitted by a visitor. */
export async function insertContact(
  db: D1Database,
  data: { name: string; shopName: string; phone: string; message: string },
): Promise<ContactMessage> {
  const result = await db
    .prepare(
      `INSERT INTO contact_messages (name, shop_name, phone, message)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
    )
    .bind(data.name, data.shopName, data.phone, data.message)
    .first<ContactRow>()
  if (!result) throw new Error('Insert failed')
  return toMessage(result)
}

/** List messages for the admin inbox. By default only non-archived; pass archived=true for the archive. */
export async function listContacts(
  db: D1Database,
  opts: { archived?: boolean; limit?: number } = {},
): Promise<ContactMessage[]> {
  const { archived = false, limit = 200 } = opts
  const rows = await db
    .prepare(
      `SELECT * FROM contact_messages
       WHERE archived = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(archived ? 1 : 0, limit)
    .all<ContactRow>()
  return (rows.results ?? []).map(toMessage)
}

/** Count unread messages (non-archived only) — used for the nav badge. */
export async function countUnread(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM contact_messages WHERE read = 0 AND archived = 0`)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/** Mark one or more messages as read. */
export async function markRead(db: D1Database, ids: number[]): Promise<void> {
  if (!ids.length) return
  const placeholders = ids.map(() => '?').join(',')
  await db
    .prepare(`UPDATE contact_messages SET read = 1 WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run()
}

/** Toggle archived flag on a message. */
export async function setArchived(db: D1Database, id: number, archived: boolean): Promise<void> {
  await db
    .prepare(`UPDATE contact_messages SET archived = ? WHERE id = ?`)
    .bind(archived ? 1 : 0, id)
    .run()
}

/** Permanently delete a message. */
export async function deleteContact(db: D1Database, id: number): Promise<void> {
  await db.prepare(`DELETE FROM contact_messages WHERE id = ?`).bind(id).run()
}

// ── Rate limiting (mirrors db/limits.ts pattern) ──────────────────────────────

/** Increment hit counter for a key; return the new count. */
export async function hitContact(
  db: D1Database,
  key: string,
  windowMs: number,
): Promise<number> {
  const now = Date.now()
  const row = await db
    .prepare(`SELECT hits, window_start FROM contact_limits WHERE key = ?`)
    .bind(key)
    .first<{ hits: number; window_start: number }>()

  if (!row || now - row.window_start > windowMs) {
    await db
      .prepare(
        `INSERT INTO contact_limits (key, hits, window_start) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET hits = 1, window_start = excluded.window_start`,
      )
      .bind(key, now)
      .run()
    return 1
  }
  const next = row.hits + 1
  await db
    .prepare(`UPDATE contact_limits SET hits = ? WHERE key = ?`)
    .bind(next, key)
    .run()
  return next
}
