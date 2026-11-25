import { HttpError } from '../lib/http'

/** Catalogue + site settings. Writes replace whole tables with a handful of statements (JSON → rows with json_each), well inside D1's free per-request query limit. */

export interface ProductDTO {
  id: string
  name: string
  company: string
  categoryId: string
  description: string
  size: string
  price: number
  mrp?: number
  image: string
  isLogo?: boolean
  active: boolean
}
export interface CategoryDTO { id: string; name: string }
export interface BrandDTO { id: string; name: string; logo: string }
export interface SlideDTO { id: string; title: string; image: string; scale: number }

export interface Catalogue {
  products: ProductDTO[]
  categories: CategoryDTO[]
  brands: BrandDTO[]
  slides: SlideDTO[]
  settings: unknown | null
}

interface ProductRow { id: string; name: string; company: string; category_id: string; description: string; size: string; price: number; mrp: number | null; image: string; is_logo: number; active: number }

export async function readCatalogue(db: D1Database, onlyActive: boolean): Promise<Catalogue & { seeded: boolean; version: number }> {
  const [products, categories, brands, slides, settings, seeded, version] = await db.batch([
    db.prepare(`SELECT * FROM products ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY sort`),
    db.prepare('SELECT id, name FROM categories ORDER BY sort'),
    db.prepare('SELECT id, name, logo FROM brands ORDER BY sort'),
    db.prepare('SELECT id, title, image, scale FROM slides ORDER BY sort'),
    db.prepare("SELECT value FROM settings WHERE key = 'site'"),
    db.prepare("SELECT value FROM meta WHERE key = 'seeded'"),
    db.prepare("SELECT value FROM meta WHERE key = 'catalogue_version'"),
  ])
  const site = (settings.results[0] as { value: string } | undefined)?.value
  return {
    seeded: seeded.results.length > 0,
    version: Number((version.results[0] as { value: string } | undefined)?.value ?? 1) || 1,
    products: (products.results as unknown as ProductRow[]).map((p) => ({
      id: p.id, name: p.name, company: p.company, categoryId: p.category_id, description: p.description, size: p.size, price: p.price,
      ...(p.mrp ? { mrp: p.mrp } : {}), image: p.image, ...(p.is_logo ? { isLogo: true } : {}), active: !!p.active,
    })),
    categories: categories.results as unknown as CategoryDTO[],
    brands: brands.results as unknown as BrandDTO[],
    slides: slides.results as unknown as SlideDTO[],
    settings: site ? JSON.parse(site) : null,
  }
}

/** D1 refuses a single value over ~2 MB; fail with a clear message instead of a crash. */
const json = (v: unknown, what: string): string => {
  const s = JSON.stringify(v)
  if (s.length > 1_900_000) throw new HttpError(413, `The ${what} are too large to save in one go.`)
  return s
}

/** Replaces the whole catalogue in one atomic batch. Input must already be sanitised (see lib/clean.ts). */
export async function writeCatalogue(db: D1Database, c: Catalogue, expectedVersion?: number): Promise<number> {
  const rows = c.products.map((p) => ({ ...p, isLogo: p.isLogo ? 1 : 0, active: p.active ? 1 : 0, mrp: p.mrp ?? null }))
  const stmts: D1PreparedStatement[] = []
  // Optimistic locking: when the caller says which version it started from, the save only goes through if nobody saved in
  // between. The guard inserts NULL into a NOT NULL column when the versions differ, which aborts (and rolls back) the whole batch.
  if (expectedVersion !== undefined) {
    stmts.push(db.prepare("INSERT INTO meta (key, value) SELECT 'version-guard', NULL WHERE CAST(COALESCE((SELECT value FROM meta WHERE key = 'catalogue_version'), '1') AS INTEGER) != ?1").bind(expectedVersion))
  }
  stmts.push(
    db.prepare('DELETE FROM products'),
    db.prepare('DELETE FROM categories'),
    db.prepare('DELETE FROM brands'),
    db.prepare('DELETE FROM slides'),
    db.prepare(
      `INSERT INTO products (id, name, company, category_id, description, size, price, mrp, image, is_logo, active, sort)
       SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), json_extract(value,'$.company'), json_extract(value,'$.categoryId'),
              json_extract(value,'$.description'), json_extract(value,'$.size'), json_extract(value,'$.price'), json_extract(value,'$.mrp'),
              json_extract(value,'$.image'), json_extract(value,'$.isLogo'), json_extract(value,'$.active'), key
       FROM json_each(?1)`,
    ).bind(json(rows, 'products')),
    db.prepare("INSERT INTO categories (id, name, sort) SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), key FROM json_each(?1)").bind(json(c.categories, 'categories')),
    db.prepare("INSERT INTO brands (id, name, logo, sort) SELECT json_extract(value,'$.id'), json_extract(value,'$.name'), json_extract(value,'$.logo'), key FROM json_each(?1)").bind(json(c.brands, 'brands')),
    db.prepare("INSERT INTO slides (id, title, image, scale, sort) SELECT json_extract(value,'$.id'), json_extract(value,'$.title'), json_extract(value,'$.image'), json_extract(value,'$.scale'), key FROM json_each(?1)").bind(json(c.slides, 'slides')),
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')"),
    db.prepare("INSERT INTO meta (key, value) VALUES ('catalogue_version', '2') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)"),
  )
  if (c.settings) {
    stmts.push(
      db
        .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('site', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(JSON.stringify(c.settings)),
    )
  }
  try {
    await db.batch(stmts)
  } catch (e) {
    if (expectedVersion !== undefined && /NOT NULL/i.test(String(e))) throw new HttpError(409, 'The shop was changed by someone else (or in another tab) since you opened it. Reload the page to get their changes, then make your edit again.')
    throw e
  }
  return Number((await db.prepare("SELECT value FROM meta WHERE key = 'catalogue_version'").first<{ value: string }>())?.value ?? 1)
}
