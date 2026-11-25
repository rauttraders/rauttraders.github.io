import { HttpError } from '../lib/http'

/** The order ledger: what was ordered and the calculated total. Nothing about the buyer is stored. */
export interface OrderItemDTO { id: string; name: string; company: string; categoryId: string; size: string; price: number; qty: number }
export interface OrderDTO { id: string; createdAt: string; items: OrderItemDTO[]; total: number; sample?: boolean }

const ORDER_ID = "'RT-' || (SELECT value FROM counters WHERE name = 'order')"

/**
 * Places an order. Prices come from the products table, never from the browser. The counter bump, the order row and
 * its lines go in ONE atomic batch, so order numbers never repeat even if two shops order at the same moment.
 */
export interface Idempotency { key: string; fingerprint: string }
export interface PlacedOrder { id: string; total: number; createdAt: string }

/** The order that an Idempotency-Key already produced, if any. */
export const findIdempotent = (db: D1Database, key: string) =>
  db
    .prepare('SELECT i.order_id AS id, i.fingerprint, o.total, o.created_at AS createdAt FROM idempotency i JOIN orders o ON o.id = i.order_id WHERE i.key = ?1')
    .bind(key)
    .first<PlacedOrder & { fingerprint: string }>()

export async function placeOrder(db: D1Database, lines: { id: string; qty: number }[], idem?: Idempotency): Promise<PlacedOrder & { replayed?: { fingerprint: string } }> {
  const ids = lines.map((l) => l.id)
  const found = await db
    .prepare('SELECT id, name, company, category_id, size, price FROM products WHERE active = 1 AND id IN (SELECT value FROM json_each(?1))')
    .bind(JSON.stringify(ids))
    .all<{ id: string; name: string; company: string; category_id: string; size: string; price: number }>()
  const byId = new Map(found.results.map((p) => [p.id, p]))
  const items = lines.map((l) => {
    const p = byId.get(l.id)
    if (!p) throw new HttpError(409, 'A product in your order is no longer available. Please refresh and try again.')
    return { orderId: '', productId: p.id, name: p.name, company: p.company, categoryId: p.category_id, size: p.size, price: p.price, qty: l.qty }
  })
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  const statements = [
    db.prepare("UPDATE counters SET value = value + 1 WHERE name = 'order'"),
    db.prepare(`INSERT INTO orders (id, total) VALUES (${ORDER_ID}, ?1)`).bind(total),
    db
      .prepare(
        `INSERT INTO order_items (order_id, product_id, name, company, category_id, size, price, qty)
         SELECT ${ORDER_ID}, json_extract(value,'$.productId'), json_extract(value,'$.name'), json_extract(value,'$.company'), json_extract(value,'$.categoryId'),
                json_extract(value,'$.size'), json_extract(value,'$.price'), json_extract(value,'$.qty')
         FROM json_each(?1)`,
      )
      .bind(JSON.stringify(items)),
  ]
  // The key is saved in the SAME atomic batch as the order. If two copies of one order arrive together, only one batch
  // can win (the key is unique); the other is rolled back completely and simply returns the winner's order.
  if (idem) statements.push(db.prepare(`INSERT INTO idempotency (key, order_id, fingerprint, created_at) VALUES (?1, ${ORDER_ID}, ?2, ?3)`).bind(idem.key, idem.fingerprint, Date.now()))
  statements.push(db.prepare(`SELECT id, created_at FROM orders WHERE id = ${ORDER_ID}`))

  let res: D1Result[]
  try {
    res = await db.batch(statements)
  } catch (e) {
    const prior = idem ? await findIdempotent(db, idem.key) : null
    if (prior) return { id: prior.id, total: prior.total, createdAt: prior.createdAt, replayed: { fingerprint: prior.fingerprint } }
    throw e
  }
  const row = res[res.length - 1].results[0] as { id: string; created_at: string }
  return { id: row.id, total, createdAt: row.created_at }
}

export async function listOrders(db: D1Database, limit = 2000): Promise<OrderDTO[]> {
  const [orders, items] = await db.batch([
    db.prepare('SELECT id, created_at, total, sample FROM orders ORDER BY created_at DESC, id DESC LIMIT ?1').bind(limit),
    db.prepare(
      `SELECT order_id, product_id, name, company, category_id, size, price, qty FROM order_items
       WHERE order_id IN (SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT ?1)`,
    ).bind(limit),
  ])
  const lines = new Map<string, OrderItemDTO[]>()
  for (const r of items.results as { order_id: string; product_id: string; name: string; company: string; category_id: string; size: string; price: number; qty: number }[]) {
    const list = lines.get(r.order_id) ?? []
    list.push({ id: r.product_id, name: r.name, company: r.company, categoryId: r.category_id, size: r.size, price: r.price, qty: r.qty })
    lines.set(r.order_id, list)
  }
  return (orders.results as { id: string; created_at: string; total: number; sample: number }[]).map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    items: lines.get(o.id) ?? [],
    total: o.total,
    ...(o.sample ? { sample: true } : {}),
  }))
}

export async function deleteOrder(db: D1Database, id: string): Promise<void> {
  await db.batch([db.prepare('DELETE FROM idempotency WHERE order_id = ?1').bind(id), db.prepare('DELETE FROM order_items WHERE order_id = ?1').bind(id), db.prepare('DELETE FROM orders WHERE id = ?1').bind(id)])
}

export async function clearSampleOrders(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE sample = 1)'),
    db.prepare('DELETE FROM orders WHERE sample = 1'),
  ])
}

export interface ImportOrder { id?: string; createdAt: string; items: OrderItemDTO[]; sample?: boolean }

const LINES_PER_CHUNK = 4000 // keeps each JSON parameter well under D1's ~2 MB limit

/** Removes every order (used by "restore", which replaces the ledger with the backup's). */
export async function wipeOrders(db: D1Database): Promise<void> {
  await db.batch([db.prepare('DELETE FROM idempotency'), db.prepare('DELETE FROM order_items'), db.prepare('DELETE FROM orders')])
}

/**
 * Bulk-inserts orders (demo data or a restored backup). Ids are kept when valid, otherwise numbered from the counter.
 * Large lists are split into chunks of ~4 000 lines, one database batch each, so nothing is cut off and no single
 * request exceeds the database's limits. The caller has already capped the total (see cleanImportOrders).
 */
export async function importOrders(db: D1Database, list: ImportOrder[]): Promise<void> {
  if (!list.length) return
  let next = (await db.prepare("SELECT value FROM counters WHERE name = 'order'").first<{ value: number }>())?.value ?? 1000
  const seen = new Set<string>()
  const prepared = list.map((o) => {
    let id = o.id && /^RT-\d+$/.test(o.id) ? o.id : ''
    if (!id || seen.has(id)) id = `RT-${++next}`
    seen.add(id)
    return { id, createdAt: o.createdAt, sample: o.sample ? 1 : 0, lines: o.items.filter((i) => i.id && i.qty >= 1) }
  })
  const maxId = Math.max(next, ...prepared.map((o) => Number(o.id.slice(3))))

  let chunk: typeof prepared = []
  let lines = 0
  const flush = async (last: boolean) => {
    if (!chunk.length) return
    const orders = chunk.map((o) => ({ id: o.id, createdAt: o.createdAt, total: o.lines.reduce((s, i) => s + i.price * i.qty, 0), sample: o.sample }))
    const items = chunk.flatMap((o) => o.lines.map((i) => ({ orderId: o.id, productId: i.id, name: i.name, company: i.company, categoryId: i.categoryId, size: i.size, price: i.price, qty: Math.min(999, Math.floor(i.qty)) })))
    const idsJson = JSON.stringify(orders.map((o) => o.id))
    await db.batch([
      db.prepare("DELETE FROM order_items WHERE order_id IN (SELECT value FROM json_each(?1))").bind(idsJson),
      db
        .prepare(
          `INSERT OR REPLACE INTO orders (id, created_at, total, sample)
           SELECT json_extract(value,'$.id'), json_extract(value,'$.createdAt'), json_extract(value,'$.total'), json_extract(value,'$.sample') FROM json_each(?1)`,
        )
        .bind(JSON.stringify(orders)),
      db
        .prepare(
          `INSERT OR REPLACE INTO order_items (order_id, product_id, name, company, category_id, size, price, qty)
           SELECT json_extract(value,'$.orderId'), json_extract(value,'$.productId'), json_extract(value,'$.name'), json_extract(value,'$.company'),
                  json_extract(value,'$.categoryId'), json_extract(value,'$.size'), json_extract(value,'$.price'), json_extract(value,'$.qty') FROM json_each(?1)`,
        )
        .bind(JSON.stringify(items)),
      db.prepare("UPDATE counters SET value = MAX(value, ?1) WHERE name = 'order'").bind(last ? maxId : next),
    ])
    chunk = []
    lines = 0
  }
  for (const o of prepared) {
    if (lines + o.lines.length > LINES_PER_CHUNK && chunk.length) await flush(false)
    chunk.push(o)
    lines += o.lines.length
  }
  await flush(true)
}
