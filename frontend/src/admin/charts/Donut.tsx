import { useState } from 'react'

export interface DonutSeg {
  label: string
  value: number
  color?: string
  /** Formatted value for the legend / centre (defaults to the raw number). */
  display?: string
}

interface DonutProps {
  segs: DonutSeg[]
  title: string
  /** Small caption above the centre value when nothing is hovered. */
  centerLabel: string
  /** Formatted total shown in the centre when nothing is hovered. */
  centerValue: string
  /** Diameter in px (default 210). */
  size?: number
}

const FALLBACK_COLORS = ['#12A5E8', '#17B6A5', '#F9A009', '#F43F5E', '#8B5CF6', '#10B981']
const GAP_PX = 8

/** Rounded modern donut chart: thick segments with round caps, clean gaps, centered total, and wrapped bottom legend. */
export default function Donut({ segs, title, centerLabel, centerValue, size = 210 }: DonutProps) {
  const SIZE = size
  const SW = Math.round(size * 0.165)
  const R = size / 2 - SW / 2 - 8
  const C = 2 * Math.PI * R
  const [hover, setHover] = useState<number | null>(null)
  const total = segs.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <p className="m-0 py-10 text-center text-[13px] text-muted">Nothing to show for this period.</p>

  const activeCount = segs.filter((x) => x.value > 0).length
  const colored = segs.map((s, i) => ({
    ...s,
    color: s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  let acc = 0
  const arcs = colored.map((s, i) => {
    const frac = s.value / total
    const rawLen = frac * C
    // strokeLinecap="round" adds SW/2 at each end (SW total), so subtract SW + GAP_PX to keep crisp gaps between caps.
    const len = activeCount > 1 ? Math.max(0.01, rawLen - SW - GAP_PX) : C
    const offset = activeCount > 1 ? -(acc * C + SW / 2 + GAP_PX / 2) : 0
    const arc = { s, i, len, offset }
    acc += frac
    return arc
  })
  const h = hover === null ? null : colored[hover]

  return (
    <div className="viz-root flex flex-col items-center justify-center gap-6 py-2">
      <div className="relative flex shrink-0 items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={title}
          className="h-auto w-full -rotate-90 overflow-visible"
        >
          {/* Subtle track ring */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--viz-grid)" strokeOpacity={0.35} strokeWidth={SW} />
          {/* Clean center hole surface */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={Math.max(0, R - SW / 2)} fill="var(--viz-surface)" />
          {arcs
            .filter((a) => a.s.value > 0)
            .map((a) => (
              <circle
                key={a.s.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={a.s.color}
                strokeWidth={hover === a.i ? SW + 5 : SW}
                strokeLinecap="round"
                strokeDasharray={`${a.len} ${C}`}
                strokeDashoffset={a.offset}
                onPointerEnter={() => setHover(a.i)}
                onPointerLeave={() => setHover(null)}
                className="cursor-pointer transition-all duration-200"
                opacity={hover === null || hover === a.i ? 1 : 0.38}
              />
            ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="max-w-[116px] truncate text-[12px] font-medium text-muted">
            {h ? h.label : centerLabel}
          </span>
          <span className="mt-0.5 text-[24px] font-bold leading-tight tracking-tight text-ink max-sm:text-[21px]">
            {h ? (h.display ?? h.value) : centerValue}
          </span>
          {h && (
            <span className="mt-0.5 text-[11px] font-semibold text-muted">
              {Math.round((h.value / total) * 100)}%
            </span>
          )}
        </div>
      </div>

      <ul className="m-0 flex w-full list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 p-0">
        {colored.map((s, i) => (
          <li
            key={s.label}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            className={`flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1 text-[12.5px] transition-colors ${
              hover === i ? 'bg-black/5 dark:bg-white/10' : ''
            }`}
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="font-medium text-ink">{s.label}</span>
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {colored.map((s) => (
            <tr key={s.label}>
              <td>{s.label}</td>
              <td>{s.display ?? s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
