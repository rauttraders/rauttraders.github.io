import { ArrowDownRight, ArrowUpRight, BadgeCheck, Clock, IndianRupee, Package, PieChart, ReceiptText, ShoppingBag, TrendingUp, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useStore } from '../../store/StoreContext'
import { useAuth } from '../auth'
import { inr, inrCompact, kpis, lastNDays, rangeDays, ordersByWeekdayHour, salesByBrand, salesByCategory, salesByDay, topProducts } from '../analytics'
import type { Kpi } from '../analytics'
import Columns from '../charts/Columns'
import Donut from '../charts/Donut'
import Heatmap from '../charts/Heatmap'
import LineChart from '../charts/LineChart'
import { Card, PanelHeader, btnSoft } from '../ui/Card'
import DateRangePicker from '../ui/DateRangePicker'

function Delta({ k }: { k: Kpi }) {
  if (k.delta === null) return <span className="text-xs text-muted">No earlier data</span>
  const up = k.delta >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${up ? 'bg-[#dff5e8] text-[#1c6b3c] dark:bg-[#1d3a2a] dark:text-[#7fd6a1]' : 'bg-[#fdeaea] text-[#c62f2c] dark:bg-[#4a2f2f] dark:text-[#ff8a87]'}`}>
        <Icon size={13} aria-hidden />
        {up ? '+' : ''}{k.delta.toFixed(0)}%
      </span>
      <span className="text-xs text-muted max-sm:hidden">vs previous period</span>
    </span>
  )
}

export default function DashboardPage() {
  const confirm = useConfirm()
  const { orders, categories, clearSampleOrders } = useStore()
  const { prefs } = useAuth()
  const [range, setRange] = useState(() => lastNDays(prefs.defaultRangeDays))
  const days = rangeDays(range)

  const k = useMemo(() => kpis(orders, range), [orders, range])
  const series = useMemo(() => salesByDay(orders, range), [orders, range])
  const heat = useMemo(() => ordersByWeekdayHour(orders, range), [orders, range])
  const top = useMemo(() => topProducts(orders, range, 6), [orders, range])
  const cats = useMemo(() => salesByCategory(orders, range, categories), [orders, range, categories])
  const brandSales = useMemo(() => salesByBrand(orders, range), [orders, range])
  const recent = orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const hasSample = orders.some((o) => o.sample)

  const catSegs = (() => {
    const head = cats.slice(0, 5).map((c) => ({ label: c.name, value: c.revenue, display: inrCompact(c.revenue), color: `var(--viz-${(c.slot % 6) + 1})` }))
    const rest = cats.slice(5).reduce((s, c) => s + c.revenue, 0)
    return rest > 0 ? [...head, { label: 'Other', value: rest, display: inrCompact(rest), color: 'var(--viz-other)' }] : head
  })()
  const brandSegs = (() => {
    const head = brandSales.slice(0, 5).map((b, i) => ({ label: b.name, value: b.revenue, display: inrCompact(b.revenue), color: `var(--viz-${(i % 6) + 1})` }))
    const rest = brandSales.slice(5).reduce((s, b) => s + b.revenue, 0)
    return rest > 0 ? [...head, { label: 'Other', value: rest, display: inrCompact(rest), color: 'var(--viz-other)' }] : head
  })()

  const cards = [
    { label: 'Revenue', k: k.revenue, value: inr(k.revenue.value), Icon: IndianRupee },
    { label: 'Orders', k: k.orders, value: String(k.orders.value), Icon: ReceiptText },
    { label: 'Avg. order value', k: k.aov, value: inr(k.aov.value), Icon: TrendingUp },
    { label: 'Units sold', k: k.units, value: String(k.units.value), Icon: Package },
  ]

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-5 max-md:gap-3.5">
      {hasSample && (
        <p className="m-0 flex flex-wrap items-center gap-3 rounded-2xl bg-[#fff4f4] px-4 py-3 text-[13px] text-[#8a2c2a] dark:bg-[#3a2e2e] dark:text-[#ffb3b0]">
          <span className="font-semibold">Some of these orders are sample data, shown so you can preview the charts.</span>
          <button type="button" className={`${btnSoft} ml-auto !h-8 !px-4`} onClick={async () => { if (await confirm({ tone: 'warning', title: 'Remove the sample orders?', message: 'Only the made-up demo orders are removed. Real customer orders are kept.', details: [{ label: 'Sample orders', value: orders.filter((o) => o.sample).length }], confirmLabel: 'Remove sample orders' })) void clearSampleOrders() }}>Clear sample data</button>
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 max-md:gap-2">
        <div>
          <h2 className="m-0 text-[20px] font-semibold text-ink max-md:text-[17px]">Overview</h2>
          <p className="m-0 mt-0.5 text-[13px] text-muted max-md:text-[12px]">Sales performance</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:gap-2.5">
        {cards.map(({ label, k: kk, value, Icon }) => (
          <Card key={label} className="!p-5 max-lg:!p-4 max-md:!p-3">
            <div className="flex items-center gap-2.5 max-sm:gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20 max-sm:h-7 max-sm:w-7"><Icon size={17} className="max-sm:h-3.5 max-sm:w-3.5" aria-hidden /></span>
              <span className="text-[13px] font-semibold text-muted max-md:text-[12px]">{label}</span>
            </div>
            <p className="m-0 mt-3 text-[27px] font-extrabold leading-none text-ink max-lg:text-[22px] max-md:mt-2 max-md:text-[18px]">{value}</p>
            <div className="mt-3 max-md:mt-2"><Delta k={kk} /></div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
        <Card>
          <PanelHeader icon={TrendingUp} title="Revenue over time" subtitle="Daily sales across the selected dates" />
          <LineChart data={series} title={`Revenue per day, ${days} days`} />
        </Card>
        <Card className="flex flex-col">
          <PanelHeader icon={Clock} title="When orders come in" subtitle="Busiest days and hours of the week" />
          <Heatmap grid={heat} title="Orders by weekday and hour" />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
        <Card>
          <PanelHeader icon={BadgeCheck} title="Sales by brand" subtitle="Share of revenue for each brand" />
          <Donut title="Sales by brand" centerLabel="Total sales" centerValue={inrCompact(brandSales.reduce((s, b) => s + b.revenue, 0))} segs={brandSegs} />
        </Card>
        <Card>
          <PanelHeader icon={PieChart} title="Sales by category" subtitle="Share of revenue for each product category" />
          <Donut title="Sales by category" centerLabel="Total sales" centerValue={inrCompact(cats.reduce((s, c) => s + c.revenue, 0))} segs={catSegs} />
        </Card>
      </div>

      <Card>
        <PanelHeader icon={Trophy} title="Top products" subtitle="Best sellers ranked by revenue" />
        <Columns title="Top products by revenue" data={top.map((p) => ({ label: p.name, value: p.revenue, display: inr(p.revenue), sub: `${p.units} units · ${p.company}` }))} />
      </Card>

      <Card>
        <PanelHeader icon={ReceiptText} title="Recent orders" subtitle="The latest orders placed" action={<Link to="/admin/orders" className="text-[13px] font-semibold text-brand no-underline hover:underline">View all</Link>} />
        {recent.length === 0 ? (
          <p className="m-0 flex items-center gap-2 py-6 text-[13px] text-muted"><ShoppingBag size={16} aria-hidden /> No orders yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {recent.map((o, i) => (
              <li key={o.id} className={`flex items-center gap-3 py-3 ${i ? 'border-t border-[#ececf0] dark:border-[#45464c]' : ''}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20"><ShoppingBag size={16} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[14px] font-bold text-ink">{o.id}</p>
                  <p className="m-0 truncate text-xs text-muted">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {o.items.length} {o.items.length === 1 ? 'product' : 'products'} · {o.items.reduce((n, i) => n + i.qty, 0)} units</p>
                </div>
                <span className="w-[84px] text-right text-[14px] font-extrabold text-ink">{inr(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
