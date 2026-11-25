import { useState } from 'react'
import { inrCompact } from '../analytics'
import { useWidth } from './useWidth'

export interface ColumnDatum {
  label: string
  value: number
  display: string
  sub?: string
}

const H = 250
const M = { t: 24, r: 8, b: 34, l: 44 }

const niceMax = (v: number) => {
  if (v <= 0) return 1000
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Vertical bars with rounded tops; the leader is highlighted, hover shows the full name. */
export default function Columns({ data, title }: { data: ColumnDatum[]; title: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>(260, 480)
  const [hover, setHover] = useState<number | null>(null)
  if (!data.length) return <p className="m-0 py-10 text-center text-[13px] text-muted">No sales in this period yet.</p>

  const iw = w - M.l - M.r
  const ih = H - M.t - M.b
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const slot = iw / data.length
  const bw = Math.min(46, slot * 0.58)
  const y = (v: number) => M.t + ih - (v / max) * ih
  const ticks = [0, 0.5, 1].map((f) => f * max)
  const chars = Math.max(6, Math.floor(slot / 6.5))
  const hd = hover === null ? null : data[hover]

  return (
    <div ref={wrap} className="viz-root relative w-full">
      <svg width={w} height={H} role="img" aria-label={title} className="block">
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeDasharray={i === 0 ? undefined : '4 4'} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--viz-axis)">{inrCompact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = M.l + slot * i + slot / 2
          const top = y(d.value)
          const h = M.t + ih - top
          const x0 = cx - bw / 2
          const on = hover === i || (hover === null && i === 0)
          return (
            <g key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="cursor-pointer">
              <rect x={M.l + slot * i} y={M.t} width={slot} height={ih + M.b} fill="transparent" />
              <rect x={x0} y={top} width={bw} height={h} rx={Math.min(bw / 2, h / 2)} fill="var(--viz-brand)" opacity={on ? 1 : 0.4} className="transition-opacity duration-200" />
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--viz-axis)">{short(d.label, chars)}</text>
            </g>
          )
        })}
      </svg>
      {hd && hover !== null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-[#1f2023] px-3 py-2 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]" style={{ left: Math.min(Math.max(M.l + slot * hover + slot / 2, 80), w - 80) }}>
          <p className="m-0 max-w-[180px] truncate font-semibold text-[#c9c9ce]">{hd.label}</p>
          <p className="m-0 text-[15px] font-extrabold">{hd.display}</p>
          {hd.sub && <p className="m-0 text-[#c9c9ce]">{hd.sub}</p>}
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.display}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
