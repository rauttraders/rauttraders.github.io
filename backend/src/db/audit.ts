/** Who did what in the admin panel. Never put passwords, tokens or shopper data in `detail`. */
export async function audit(db: D1Database, actor: string, action: string, detail = ''): Promise<void> {
  try {
    await db.prepare('INSERT INTO audit_log (actor, action, detail) VALUES (?1, ?2, ?3)').bind(actor.slice(0, 100), action.slice(0, 60), detail.slice(0, 300)).run()
  } catch (e) {
    console.error('audit log failed', e) // an audit problem must never break the action itself
  }
}

export const recentAudit = async (db: D1Database, limit = 200) =>
  (await db.prepare('SELECT id, at, actor, action, detail FROM audit_log ORDER BY id DESC LIMIT ?1').bind(limit).all<{ id: number; at: string; actor: string; action: string; detail: string }>()).results
