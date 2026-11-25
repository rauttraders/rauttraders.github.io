import { ChevronDown, Copy, Download, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { formatINR } from '../../lib/format'
import { useStore } from '../../store/StoreContext'
import type { Order } from '../../store/types'
import { inr } from '../analytics'
import { btnDanger, btnSoft } from '../ui/Card'

/**
 * Orders are a simple ledger: what was ordered, in what quantity, and the calculated total.
 * No customer details are stored or shown — the customer talks to the shop on WhatsApp.
 */

type Range = 'today' | '7' | '30' | 'all'
const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: 'all', label: 'All' },
]

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
const full = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const t = new Date()
  const y = new Date()
  y.setDate(t.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  return same(d, t) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}
const units = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0)

function inRange(o: Order, r: Range): boolean {
  if (r === 'all') return true
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (r !== 'today') start.setDate(start.getDate() - (Number(r) - 1))
  return new Date(o.createdAt) >= start
}

function toCsv(orders: Order[]) {
  // A cell that starts with = + - @ would be run as a formula by Excel/Sheets; a leading apostrophe keeps it plain text.
  const esc = (v: string | number) => `"${(/^[=+\-@\t\r]/.test(String(v)) ? "'" : '') + String(v).replace(/"/g, '""')}"`
  const rows = [['Order', 'Date', 'Product', 'Brand', 'Size', 'Quantity', 'Unit price', 'Line total', 'Order total']]
  for (const o of orders) {
    for (const i of o.items) rows.push([o.id, new Date(o.createdAt).toISOString(), i.name, i.company, i.size, String(i.qty), String(i.price), String(i.qty * i.price), String(o.total)])
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

function orderText(o: Order): string {
  return [
    `Order ${o.id} — ${full(o.createdAt)}`,
    ...o.items.map((i, n) => `${n + 1}. ${i.name} (${i.company}, ${i.size}) — ${i.qty} × ${formatINR(i.price)} = ${formatINR(i.qty * i.price)}`),
    `Total: ${formatINR(o.total)}`,
  ].join('\n')
}

function OrderRow({ order, open, onToggle }: { order: Order; open: boolean; onToggle: () => void }) {
  const { deleteOrder } = useStore()
  const confirm = useConfirm()
  const [copied, setCopied] = useState(false)
  const u = units(order)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderText(order))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-[#ececf0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#45464c] dark:bg-[#34353a]">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent p-4 text-left max-md:gap-2.5 max-md:p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20 max-md:h-9 max-md:w-9">
          <ShoppingBag size={18} className="max-md:h-4 max-md:w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-ink max-md:text-[13.5px]">{order.id}</span>
          <span className="block text-xs text-muted max-md:text-[11px]">{time(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'product' : 'products'} · {u} {u === 1 ? 'unit' : 'units'}</span>
        </span>
        <span className="text-[16px] font-extrabold text-ink max-md:text-[14px]">{inr(order.total)}</span>
        <ChevronDown size={18} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[#ececf0] px-4 pb-4 pt-3 dark:border-[#45464c]">
          <p className="m-0 mb-2 text-xs text-muted">{full(order.createdAt)}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Product</th>
                  <th className="pb-2 text-right font-semibold">Qty</th>
                  <th className="pb-2 text-right font-semibold">Price</th>
                  <th className="pb-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-t border-[#f1f1f4] dark:border-[#45464c]">
                    <td className="py-2 pr-3 text-ink">
                      <span className="font-semibold">{i.name}</span>
                      <span className="block text-xs text-muted">{i.company} · {i.size}</span>
                    </td>
                    <td className="py-2 text-right text-ink">{i.qty}</td>
                    <td className="py-2 text-right text-ink">{formatINR(i.price)}</td>
                    <td className="py-2 text-right font-semibold text-ink">{formatINR(i.qty * i.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#ececf0] dark:border-[#45464c]">
                  <td className="pt-3 font-bold text-ink">Total</td>
                  <td className="pt-3 text-right font-semibold text-ink">{u}</td>
                  <td />
                  <td className="pt-3 text-right text-[15px] font-extrabold text-brand">{formatINR(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => void copy()} className={btnSoft}><Copy size={14} aria-hidden /> {copied ? 'Copied ✓' : 'Copy order'}</button>
            <button
              type="button"
              className={`${btnDanger} !px-4`}
              onClick={async () => {
                if (await confirm({ tone: 'danger', title: `Delete order ${order.id}?`, message: 'This removes the order from your records. It cannot be undone.', confirmLabel: 'Delete order' })) deleteOrder(order.id)
              }}
            >
              <Trash2 size={14} aria-hidden /> Delete
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export default function OrdersPage() {
  const { orders } = useStore()
  const [range, setRange] = useState<Range>('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return orders
      .filter((o) => inRange(o, range) && (!t || `${o.id} ${o.items.map((i) => `${i.name} ${i.company}`).join(' ')}`.toLowerCase().includes(t)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, range, q])

  const groups = useMemo(() => {
    const g: { label: string; items: Order[] }[] = []
    for (const o of rows) {
      const label = dayLabel(o.createdAt)
      const last = g[g.length - 1]
      if (last && last.label === label) last.items.push(o)
      else g.push({ label, items: [o] })
    }
    return g
  }, [rows])

  const totalValue = rows.reduce((s, o) => s + o.total, 0)
  const totalUnits = rows.reduce((s, o) => s + units(o), 0)

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tab = (on: boolean) => `h-9 cursor-pointer whitespace-nowrap rounded-full border-0 px-4 text-[13px] font-semibold transition-colors max-md:h-8 max-md:px-3 max-md:text-[12px] ${on ? 'bg-brand text-white shadow-[0_3px_8px_rgba(239,83,80,0.4)]' : 'bg-white text-muted hover:text-ink dark:bg-[#34353a]'}`

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5 max-md:gap-3.5">
      <div className="grid grid-cols-3 gap-3 max-md:gap-2">
        {[
          { label: 'Orders', value: String(rows.length) },
          { label: 'Units ordered', value: String(totalUnits) },
          { label: 'Order value', value: inr(totalValue) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#ececf0] bg-white p-4 dark:border-[#45464c] dark:bg-[#34353a] max-md:rounded-xl max-md:p-2.5">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-muted max-md:text-[10px]">{s.label}</p>
            <p className="m-0 mt-1 text-[24px] font-extrabold text-ink max-lg:text-[20px] max-md:text-[16px]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-[220px] flex-1">
          <Search size={15} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order number or product" aria-label="Search orders" className="h-10 w-full rounded-full border border-transparent bg-white pl-10 pr-4 text-[13px] text-ink outline-none focus:border-brand dark:bg-[#34353a]" />
        </label>
        <button type="button" onClick={exportCsv} disabled={!rows.length} className={btnSoft} title="Download the listed orders as CSV"><Download size={15} aria-hidden /> Export</button>
      </div>

      <div role="group" aria-label="Filter by date" className="-mt-1 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RANGES.map((r) => (
          <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => setRange(r.key)} className={tab(range === r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="m-0 flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-[14px] text-muted dark:bg-[#34353a]"><ShoppingBag size={26} aria-hidden /> No orders match.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="mb-2 mt-0 px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{g.label}</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {g.items.map((o) => (
                <OrderRow key={o.id} order={o} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
