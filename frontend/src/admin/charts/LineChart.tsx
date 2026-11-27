import { useState } from 'react'
import { inr, inrCompact } from '../analytics'
import type { DayPoint } from '../analytics'
import { smoothPath } from './path'
import { useWidth } from './useWidth'

const H = 280
const M = { t: 32, r: 22, b: 32, l: 52 }

/** Round axis steps (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10 × 10^n) to avoid unnecessary empty space above the peak. */
const niceStep = (v: number) => {
  if (v <= 0) return 250
  const raw = v / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  const snap = f <= 1 ? 1 : f <= 1.2 ? 1.2 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10
  return snap * p
}

/** Smooth coral line chart with chronological time-based X-axis, light-blue grid, highlighted markers, and upper-right legend. */
export default function LineChart({ data, title }: { data: DayPoint[]; title: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>(280, 640)
  const [hover, setHover] = useState<number | null>(null)

  const sorted = [...data]
    .map((d) => ({ ...d, revenue: Number.isFinite(d.revenue) ? Math.max(0, d.revenue) : 0 }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const iw = w - M.l - M.r
  const ih = H - M.t - M.b
  const maxRev = sorted.reduce((m, d) => Math.max(m, d.revenue), 0)
  const step4 = niceStep(maxRev)
  const max = step4 * 4

  const t0 = sorted[0]?.date.getTime() ?? 0
  const tLast = sorted[sorted.length - 1]?.date.getTime() ?? t0
  const tSpan = tLast - t0

  const x = (i: number) => {
    if (sorted.length <= 1 || tSpan <= 0) return M.l + iw / 2
    return M.l + ((sorted[i].date.getTime() - t0) / tSpan) * iw
  }
  const y = (v: number) => M.t + ih - (v / max) * ih
  const pts = sorted.map((d, i): [number, number] => [x(i), y(d.revenue)])
  const line = smoothPath(pts)
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step4)
  const labelEvery = Math.ceil(sorted.length / Math.max(2, Math.floor(iw / 84)))
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const xLabelIndices = sorted
    .map((_, i) => i)
    .filter((i) => (i % labelEvery === 0 && sorted.length - 1 - i >= labelEvery * 0.6) || i === sorted.length - 1)

  // Highlight peak and distinct lowest positive point without cluttering every point
  const highlighted: { idx: number; label: string; px: number; py: number }[] = []
  if (sorted.length > 0) {
    let maxIdx = 0
    let minIdx = -1
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].revenue > sorted[maxIdx].revenue) maxIdx = i
      if (sorted[i].revenue > 0 && (minIdx === -1 || sorted[i].revenue < sorted[minIdx].revenue)) minIdx = i
    }
    if (sorted[maxIdx].revenue > 0) {
      highlighted.push({ idx: maxIdx, label: inrCompact(sorted[maxIdx].revenue), px: pts[maxIdx][0], py: pts[maxIdx][1] })
    }
    if (minIdx !== -1 && minIdx !== maxIdx && Math.abs(pts[minIdx][0] - pts[maxIdx][0]) > 56) {
      highlighted.push({ idx: minIdx, label: inrCompact(sorted[minIdx].revenue), px: pts[minIdx][0], py: pts[minIdx][1] })
    }
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (sorted.length === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.abs(pts[i][0] - px)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    setHover(best)
  }
  const hp = hover === null ? null : sorted[hover]

  return (
    <div ref={wrap} className="viz-root relative w-full rounded-xl bg-white p-2 dark:bg-[#2b2c30]">
      {/* Upper-right compact legend */}
      <div className="pointer-events-none absolute right-5 top-2 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[11.5px] font-medium text-[#34495E] dark:bg-[#2b2c30]/90 dark:text-[#c9c9ce]">
        <span aria-hidden className="inline-flex items-center">
          <span className="h-[2px] w-3 rounded-full bg-[#FF8585]" />
          <span className="-ml-1.5 h-2 w-2 rounded-full bg-[#FF7078]" />
        </span>
        <span>Revenue</span>
      </div>

      <svg width={w} height={H} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-none">
        {/* Horizontal light-blue grid lines + Y-axis labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="#D5E8FF" strokeWidth="1" className="dark:opacity-20" />
            <text x={M.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fontWeight="500" fill="#4784B9">
              {inrCompact(t)}
            </text>
          </g>
        ))}

        {/* Vertical light-blue grid lines + X-axis date labels */}
        {xLabelIndices.map((i) => (
          <g key={sorted[i].key}>
            <line x1={x(i)} x2={x(i)} y1={M.t} y2={M.t + ih} stroke="#D5E8FF" strokeWidth="1" className="dark:opacity-20" />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fontWeight="500" fill="#4784B9">
              {fmtDate(sorted[i].date)}
            </text>
          </g>
        ))}

        {/* Smooth coral curve */}
        <path d={line} fill="none" stroke="#FF8585" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Highlighted data points + floating coral pill labels (clamped away from upper-right legend) */}
        {highlighted.map((hl) => {
          const pillW = Math.max(40, hl.label.length * 7 + 14)
          const pillX = Math.min(Math.max(hl.px - pillW / 2, M.l), w - M.r - pillW)
          const inLegendZone = pillX + pillW > w - 115 && hl.py - 26 < 30
          const aboveY = hl.py - 26
          const pillY = !inLegendZone && aboveY >= 4 ? aboveY : hl.py + 10
          return (
            <g key={hl.idx} className="pointer-events-none">
              <circle cx={hl.px} cy={hl.py} r="4.5" fill="#FF7078" stroke="#FFFFFF" strokeWidth="2" />
              <rect x={pillX} y={pillY} width={pillW} height={19} rx="6" fill="#FFAAAA" />
              <text x={pillX + pillW / 2} y={pillY + 13} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFFFFF">
                {hl.label}
              </text>
            </g>
          )
        })}

        {/* Hover crosshair + active marker */}
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="#FF8585" strokeOpacity="0.6" strokeWidth="1.25" strokeDasharray="4 4" />
            <circle cx={x(hover)} cy={y(hp.revenue)} r="5.5" fill="#FF7078" stroke="#FFFFFF" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-3 z-20 -translate-x-1/2 rounded-xl bg-[#34495E] px-3.5 py-2 text-[12px] text-white shadow-[0_8px_20px_rgba(52,73,94,0.28)]"
          style={{ left: Math.min(Math.max(x(hover), 84), w - 84) }}
        >
          <p className="m-0 font-medium text-[#D5E8FF]">
            {hp.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <p className="m-0 mt-0.5 text-[14px] font-bold">{inr(hp.revenue)}</p>
          <p className="m-0 text-[#D5E8FF]">
            {hp.orders} {hp.orders === 1 ? 'order' : 'orders'}
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Revenue</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.key}>
              <td>{d.key}</td>
              <td>{inr(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
