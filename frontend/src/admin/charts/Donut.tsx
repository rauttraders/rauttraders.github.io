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
const GAP_PX = 5

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)]

/**
 * Builds a closed annular-sector SVG path between [rIn, rOut] and angles [a0, a1] (radians)
 * with adaptive rounded corners so small segments stay true curved arcs instead of collapsing into dots.
 */
function roundedArcPath(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number, maxRadius: number): string {
  const span = a1 - a0
  const cr = Math.max(1.2, Math.min(maxRadius, (rIn * span) / 2.4, (rOut * span) / 2.4))
  const dr = Math.min((rOut - rIn) * 0.45, cr)
  const dOut = Math.min(span * 0.45, cr / rOut)
  const dIn = Math.min(span * 0.45, cr / rIn)
  const large = span - 2 * dOut > Math.PI ? 1 : 0
  const largeIn = span - 2 * dIn > Math.PI ? 1 : 0

  const [sx, sy] = polar(cx, cy, rOut - dr, a0)
  const [oc0x, oc0y] = polar(cx, cy, rOut, a0)
  const [os0x, os0y] = polar(cx, cy, rOut, a0 + dOut)
  const [os1x, os1y] = polar(cx, cy, rOut, a1 - dOut)
  const [oc1x, oc1y] = polar(cx, cy, rOut, a1)
  const [r1x, r1y] = polar(cx, cy, rOut - dr, a1)
  const [r2x, r2y] = polar(cx, cy, rIn + dr, a1)
  const [ic1x, ic1y] = polar(cx, cy, rIn, a1)
  const [is1x, is1y] = polar(cx, cy, rIn, a1 - dIn)
  const [is0x, is0y] = polar(cx, cy, rIn, a0 + dIn)
  const [ic0x, ic0y] = polar(cx, cy, rIn, a0)
  const [ex, ey] = polar(cx, cy, rIn + dr, a0)

  return [
    `M${sx.toFixed(2)} ${sy.toFixed(2)}`,
    `Q${oc0x.toFixed(2)} ${oc0y.toFixed(2)} ${os0x.toFixed(2)} ${os0y.toFixed(2)}`,
    `A${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 ${large} 1 ${os1x.toFixed(2)} ${os1y.toFixed(2)}`,
    `Q${oc1x.toFixed(2)} ${oc1y.toFixed(2)} ${r1x.toFixed(2)} ${r1y.toFixed(2)}`,
    `L${r2x.toFixed(2)} ${r2y.toFixed(2)}`,
    `Q${ic1x.toFixed(2)} ${ic1y.toFixed(2)} ${is1x.toFixed(2)} ${is1y.toFixed(2)}`,
    `A${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 ${largeIn} 0 ${is0x.toFixed(2)} ${is0y.toFixed(2)}`,
    `Q${ic0x.toFixed(2)} ${ic0y.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/** Rounded modern donut chart: adaptive rounded-end arcs, accurate proportions, clean gaps, and wrapped bottom legend. */
export default function Donut({ segs, title, centerLabel, centerValue, size = 210 }: DonutProps) {
  const SIZE = size
  const CX = SIZE / 2
  const CY = SIZE / 2
  const SW = Math.round(size * 0.165)
  const R = SIZE / 2 - SW / 2 - 8
  const [hover, setHover] = useState<number | null>(null)
  const total = segs.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <p className="m-0 py-10 text-center text-[13px] text-muted">Nothing to show for this period.</p>

  const activeCount = segs.filter((x) => x.value > 0).length
  const colored = segs.map((s, i) => ({
    ...s,
    color: s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  const gapRad = activeCount > 1 ? GAP_PX / R : 0
  let accAngle = -Math.PI / 2
  const arcs = colored.map((s, i) => {
    const span = (s.value / total) * Math.PI * 2
    const mid = accAngle + span / 2
    const trimmed = activeCount > 1 ? Math.max(0.025, span - gapRad) : span
    const a0 = mid - trimmed / 2
    const a1 = mid + trimmed / 2
    accAngle += span
    return { s, i, a0, a1, fullCircle: activeCount === 1 && s.value > 0 }
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
          className="h-auto w-full overflow-visible"
        >
          {/* Subtle track ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--viz-grid)" strokeOpacity={0.35} strokeWidth={SW} />
          {/* Clean center hole surface */}
          <circle cx={CX} cy={CY} r={Math.max(0, R - SW / 2)} fill="var(--viz-surface)" />
          {arcs
            .filter((a) => a.s.value > 0)
            .map((a) => {
              const isHover = hover === a.i
              const sw = isHover ? SW + 4 : SW
              const rIn = R - sw / 2
              const rOut = R + sw / 2
              const opacity = hover === null || isHover ? 1 : 0.38
              if (a.fullCircle) {
                return (
                  <circle
                    key={a.s.label}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={a.s.color}
                    strokeWidth={sw}
                    onPointerEnter={() => setHover(a.i)}
                    onPointerLeave={() => setHover(null)}
                    className="cursor-pointer transition-all duration-200"
                    opacity={opacity}
                  />
                )
              }
              return (
                <path
                  key={a.s.label}
                  d={roundedArcPath(CX, CY, rIn, rOut, a.a0, a.a1, sw * 0.44)}
                  fill={a.s.color}
                  onPointerEnter={() => setHover(a.i)}
                  onPointerLeave={() => setHover(null)}
                  className="cursor-pointer transition-all duration-200"
                  opacity={opacity}
                />
              )
            })}
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
