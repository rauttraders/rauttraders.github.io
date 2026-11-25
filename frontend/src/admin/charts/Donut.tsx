import { useState } from 'react'

export interface DonutSeg {
  label: string
  value: number
  color: string
  /** Formatted value for the legend / centre (defaults to the raw number). */
  display?: string
}

interface DonutProps {
  segs: DonutSeg[]
  title: string
  /** Small caption under the centre value when nothing is hovered. */
  centerLabel: string
  /** Formatted total shown in the centre when nothing is hovered. */
  centerValue: string
  /** Diameter in px (default 190). */
  size?: number
}

const GAP = 3

/** Donut chart: hover a slice (or its legend row) to read it in the centre. */
export default function Donut({ segs, title, centerLabel, centerValue, size = 190 }: DonutProps) {
  const SIZE = size
  const SW = Math.round(size * 0.126)
  const R = size / 2 - SW / 2 - 6
  const C = 2 * Math.PI * R
  const [hover, setHover] = useState<number | null>(null)
  const total = segs.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <p className="m-0 py-10 text-center text-[13px] text-muted">Nothing to show for this period.</p>

  let acc = 0
  const arcs = segs.map((s, i) => {
    const frac = s.value / total
    const len = Math.max(0, frac * C - (segs.filter((x) => x.value > 0).length > 1 ? GAP : 0))
    const arc = { s, i, len, offset: -acc * C }
    acc += frac
    return arc
  })
  const h = hover === null ? null : segs[hover]

  return (
    <div className="viz-root flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={title} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--viz-grid)" strokeWidth={SW} />
          {arcs.filter((a) => a.s.value > 0).map((a) => (
            <circle
              key={a.s.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.s.color}
              strokeWidth={hover === a.i ? SW + 6 : SW}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={a.offset}
              onPointerEnter={() => setHover(a.i)}
              onPointerLeave={() => setHover(null)}
              className="cursor-pointer transition-all duration-200"
              opacity={hover === null || hover === a.i ? 1 : 0.45}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[100px] truncate text-[11px] font-semibold text-muted">{h ? h.label : centerLabel}</span>
          <span className={`${size > 210 ? 'text-[28px]' : 'text-[22px]'} font-extrabold leading-tight text-ink`}>{h ? (h.display ?? h.value) : centerValue}</span>
          {h && <span className="text-[11px] font-semibold text-muted">{Math.round((h.value / total) * 100)}%</span>}
        </div>
      </div>

      <ul className="m-0 flex min-w-[180px] flex-1 list-none flex-col gap-1 p-0">
        {segs.map((s, i) => (
          <li key={s.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className={`flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${hover === i ? 'bg-black/5 dark:bg-white/10' : ''}`}>
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
            <span className="font-extrabold text-ink">{s.display ?? s.value}</span>
            <span className="w-9 text-right text-xs text-muted">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{segs.map((s) => <tr key={s.label}><td>{s.label}</td><td>{s.display ?? s.value}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
