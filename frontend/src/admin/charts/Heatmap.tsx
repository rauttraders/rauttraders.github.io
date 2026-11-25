import { useState } from 'react'
import { HEAT_HOURS, WEEKDAYS } from '../analytics'

const LEVELS = [0.16, 0.34, 0.55, 0.78, 1]
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`

/** Weekday × hour grid. One hue, darker = more orders (zero stays neutral). */
export default function Heatmap({ grid, title }: { grid: number[][]; title: string }) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const max = Math.max(...grid.flat(), 1)
  const level = (n: number) => (n === 0 ? -1 : Math.min(LEVELS.length - 1, Math.ceil((n / max) * LEVELS.length) - 1))
  const h = hover ? { day: WEEKDAYS[hover[0]], hour: HEAT_HOURS[hover[1]], n: grid[hover[0]][hover[1]] } : null

  return (
    <div className="viz-root flex flex-1 flex-col">
      <div role="img" aria-label={title} className="grid items-center gap-1" style={{ gridTemplateColumns: `30px repeat(${HEAT_HOURS.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHover(null)}>
        {WEEKDAYS.map((d, r) => (
          <div key={d} className="contents">
            <span className="text-[11px] font-semibold text-[var(--viz-axis)]">{d}</span>
            {HEAT_HOURS.map((hr, c) => {
              const n = grid[r][c]
              const lv = level(n)
              const on = hover && hover[0] === r && hover[1] === c
              return (
                <span
                  key={hr}
                  onPointerEnter={() => setHover([r, c])}
                  className={`h-7 min-w-0 rounded-md sm:aspect-[1.25/1] sm:h-auto sm:min-h-[24px] transition-transform ${on ? 'scale-110 ring-2 ring-[var(--viz-brand)] ring-offset-1 ring-offset-[var(--viz-surface)]' : ''}`}
                  style={{ background: lv < 0 ? 'var(--viz-grid)' : 'var(--viz-brand)', opacity: lv < 0 ? 0.6 : LEVELS[lv] }}
                />
              )
            })}
          </div>
        ))}
        <span />
        {HEAT_HOURS.map((hr) => <span key={hr} className="text-center text-[10px] font-semibold text-[var(--viz-axis)]">{hourLabel(hr)}</span>)}
      </div>

      <div className="flex-1" />
      <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e3e8] px-5 py-3.5 text-[12px] text-muted dark:border-[#45464c]">
        <span className="min-h-[18px] font-semibold text-ink">{h ? `${h.day} at ${hourLabel(h.hour)} — ${h.n} ${h.n === 1 ? 'order' : 'orders'}` : 'Hover a square for details'}</span>
        <span className="flex items-center gap-1.5">
          Fewer
          {LEVELS.map((o) => <span key={o} aria-hidden className="h-3 w-5 rounded-[4px]" style={{ background: 'var(--viz-brand)', opacity: o }} />)}
          More
        </span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Day</th>{HEAT_HOURS.map((hr) => <th key={hr}>{hourLabel(hr)}</th>)}</tr></thead>
        <tbody>{grid.map((row, r) => <tr key={WEEKDAYS[r]}><td>{WEEKDAYS[r]}</td>{row.map((n, c) => <td key={c}>{n}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
