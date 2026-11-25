/** Counts hits per key inside a time window (used to slow down abuse of the public order endpoint). Returns the hit count including this one. */
export async function hit(db: D1Database, key: string, windowMs: number): Promise<number> {
  const now = Date.now()
  const r = await db
    .prepare(
      `INSERT INTO order_limits (key, hits, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         hits = CASE WHEN ?2 - window_start > ?3 THEN 1 ELSE hits + 1 END,
         window_start = CASE WHEN ?2 - window_start > ?3 THEN ?2 ELSE window_start END
       RETURNING hits`,
    )
    .bind(key, now, windowMs)
    .first<{ hits: number }>()
  return r?.hits ?? 1
}

/** Daily housekeeping (run by the cron trigger). */
export async function purgeExpired(db: D1Database): Promise<void> {
  const now = Date.now()
  const dayAgo = now - 24 * 3600 * 1000
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now),
    db.prepare('DELETE FROM login_attempts WHERE window_start < ?1 AND locked_until < ?2').bind(dayAgo, now),
    db.prepare('DELETE FROM order_limits WHERE window_start < ?1').bind(dayAgo),
    db.prepare("DELETE FROM audit_log WHERE at < datetime('now', '-180 days')"),
    db.prepare('DELETE FROM idempotency WHERE created_at < ?1').bind(now - 48 * 3600 * 1000),
  ])
}
