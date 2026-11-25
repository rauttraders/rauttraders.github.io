import { useId, useState } from 'react'
import { inr, inrCompact } from '../analytics'
import type { DayPoint } from '../analytics'
import { smoothPath } from './path'
import { useWidth } from './useWidth'

const H = 280
const M = { t: 16, r: 22, b: 30, l: 46 }

/** Round axis steps (1, 2, 2.5, 5 × 10^n) so ticks read as ₹2k, ₹4k … rather than ₹1.3k. */
const niceStep = (v: number) => {
  if (v <= 0) return 250
  const raw = v / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

/** Smooth line graph with point markers and a crosshair tooltip. */
export default function LineChart({ data, title }: { data: DayPoint[]; title: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>(280, 640)
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId()

  const iw = w - M.l - M.r
  const ih = H - M.t - M.b
  const step4 = niceStep(Math.max(...data.map((d) => d.revenue), 0))
  const max = step4 * 4
  const x = (i: number) => M.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => M.t + ih - (v / max) * ih
  const pts = data.map((d, i): [number, number] => [x(i), y(d.revenue)])
  const line = smoothPath(pts)
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${M.t + ih} L${x(0).toFixed(1)} ${M.t + ih} Z`
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step4)
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(iw / 84)))
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const showDots = data.length <= 31

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - M.l) / iw) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }
  const hp = hover === null ? null : data[hover]

  return (
    <div ref={wrap} className="viz-root relative w-full">
      <svg width={w} height={H} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--viz-brand)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--viz-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeDasharray={i === 0 ? undefined : '4 4'} />
            <text x={M.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--viz-axis)">{inrCompact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => ((i % labelEvery === 0 && data.length - 1 - i >= labelEvery * 0.6) || i === data.length - 1 ? (
          <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--viz-axis)">{fmtDate(d.date)}</text>
        ) : null))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="var(--viz-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {showDots && pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="3" fill="var(--viz-surface)" stroke="var(--viz-brand)" strokeWidth="2" />)}
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="var(--viz-brand)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={x(hover)} cy={y(hp.revenue)} r="6" fill="var(--viz-brand)" stroke="var(--viz-surface)" strokeWidth="3" />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-xl bg-[#1f2023] px-3.5 py-2.5 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ left: Math.min(Math.max(x(hover), 84), w - 84) }}>
          <p className="m-0 font-semibold text-[#c9c9ce]">{hp.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p className="m-0 mt-0.5 text-[15px] font-extrabold">{inr(hp.revenue)}</p>
          <p className="m-0 text-[#c9c9ce]">{hp.orders} {hp.orders === 1 ? 'order' : 'orders'}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Date</th><th>Revenue</th><th>Orders</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.key}><td>{d.key}</td><td>{inr(d.revenue)}</td><td>{d.orders}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
