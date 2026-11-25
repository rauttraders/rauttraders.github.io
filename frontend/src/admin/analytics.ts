import type { Category, Order } from '../store/types'

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Inclusive day range (both ends at local midnight). */
export interface Range {
  from: Date
  to: Date
}

export const sod = startOfDay
export const rangeDays = (r: Range) => Math.round((startOfDay(r.to).getTime() - startOfDay(r.from).getTime()) / 86400000) + 1
export const lastNDays = (n: number): Range => {
  const today = startOfDay(new Date())
  return { from: addDays(today, -(n - 1)), to: today }
}
/** The equally long range just before `r` (for "vs previous period"). */
export const previousRange = (r: Range): Range => {
  const n = rangeDays(r)
  const to = addDays(startOfDay(r.from), -1)
  return { from: addDays(to, -(n - 1)), to }
}

export function inRange(orders: Order[], r: Range): Order[] {
  const start = startOfDay(r.from)
  const end = addDays(startOfDay(r.to), 1)
  return orders.filter((o) => {
    const t = new Date(o.createdAt)
    return t >= start && t < end
  })
}

/** Every order counts as a sale. (Older orders stored by the server may carry a legacy `cancelled` status — those are skipped.) */
export const counted = (orders: Order[]) => orders.filter((o) => (o as { status?: string }).status !== 'cancelled')
export const revenue = (orders: Order[]) => counted(orders).reduce((s, o) => s + o.total, 0)
export const units = (orders: Order[]) => counted(orders).reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0)

export interface Kpi {
  value: number
  /** Percent change vs the previous equal-length window; null when there is nothing to compare. */
  delta: number | null
}
const pct = (cur: number, prev: number): number | null => (prev === 0 ? null : ((cur - prev) / prev) * 100)

export function kpis(orders: Order[], range: Range) {
  const cur = inRange(orders, range)
  const prev = inRange(orders, previousRange(range))
  const aov = (o: Order[]) => (counted(o).length ? revenue(o) / counted(o).length : 0)
  const mk = (c: number, p: number): Kpi => ({ value: c, delta: pct(c, p) })
  return {
    revenue: mk(revenue(cur), revenue(prev)),
    orders: mk(counted(cur).length, counted(prev).length),
    aov: mk(aov(cur), aov(prev)),
    units: mk(units(cur), units(prev)),
  }
}

export interface DayPoint {
  key: string
  date: Date
  revenue: number
  orders: number
  units: number
}

export function salesByDay(orders: Order[], range: Range): DayPoint[] {
  const last = startOfDay(range.to)
  const days = rangeDays(range)
  const pts: DayPoint[] = []
  const idx = new Map<string, DayPoint>()
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(last, -i)
    const p = { key: dayKey(date), date, revenue: 0, orders: 0, units: 0 }
    pts.push(p)
    idx.set(p.key, p)
  }
  for (const o of counted(orders)) {
    const p = idx.get(dayKey(new Date(o.createdAt)))
    if (p) {
      p.revenue += o.total
      p.orders += 1
      p.units += o.items.reduce((n, i) => n + i.qty, 0)
    }
  }
  return pts
}

export function topProducts(orders: Order[], range: Range, n = 6) {
  const m = new Map<string, { id: string; name: string; company: string; revenue: number; units: number }>()
  for (const o of counted(inRange(orders, range))) {
    for (const i of o.items) {
      const r = m.get(i.id) ?? { id: i.id, name: i.name, company: i.company, revenue: 0, units: 0 }
      r.revenue += i.price * i.qty
      r.units += i.qty
      m.set(i.id, r)
    }
  }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n)
}

export function salesByCategory(orders: Order[], range: Range, categories: Category[]) {
  const m = new Map<string, number>()
  for (const o of counted(inRange(orders, range))) for (const i of o.items) m.set(i.categoryId, (m.get(i.categoryId) ?? 0) + i.price * i.qty)
  const rows = categories.map((c, idx) => ({ id: c.id, name: c.name, revenue: m.get(c.id) ?? 0, slot: idx }))
  return rows.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue)
}

export function salesByBrand(orders: Order[], range: Range) {
  const m = new Map<string, number>()
  for (const o of counted(inRange(orders, range))) for (const i of o.items) m.set(i.company, (m.get(i.company) ?? 0) + i.price * i.qty)
  return [...m.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
export const inrCompact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `₹${Math.round(n)}`)

export const HEAT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Order counts by weekday (Mon–Sun) and hour of day, for the heatmap. */
export function ordersByWeekdayHour(orders: Order[], range: Range) {
  const grid = WEEKDAYS.map(() => HEAT_HOURS.map(() => 0))
  for (const o of counted(inRange(orders, range))) {
    const d = new Date(o.createdAt)
    const col = Math.min(HEAT_HOURS.length - 1, Math.max(0, d.getHours() - HEAT_HOURS[0]))
    grid[(d.getDay() + 6) % 7][col] += 1
  }
  return grid
}
