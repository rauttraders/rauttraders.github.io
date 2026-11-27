import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { rangeDays, sod } from '../analytics'
import type { Range } from '../analytics'
import { usePopover } from './usePopover'

const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const fmt = (d: Date, year = false) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

interface Props {
  value: Range
  onChange: (r: Range) => void
}

/** Overall calendar date-range picker: click a start day, then an end day. */
export default function DateRangePicker({ value, onChange }: Props) {
  const { open, setOpen, anchor, pop, pos } = usePopover<HTMLButtonElement>()
  const [view, setView] = useState(() => monthStart(value.to))
  const [start, setStart] = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const today = sod(new Date())

  const label = same(value.from, value.to) ? fmt(value.from, true) : `${fmt(value.from)} – ${fmt(value.to, true)}`

  const toggle = () => {
    if (!open) {
      setView(monthStart(value.to))
      setStart(null)
      setHover(null)
    }
    setOpen((o) => !o)
  }

  const pick = (d: Date) => {
    if (!start) return setStart(d)
    const [from, to] = d < start ? [d, start] : [start, d]
    onChange({ from, to })
    setStart(null)
    setOpen(false)
  }

  // Preview range while choosing the end day.
  const shown: Range = start ? (hover && hover < start ? { from: hover, to: start } : { from: start, to: hover && hover >= start ? hover : start }) : value

  const first = monthStart(view)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - lead + i))
  const canNext = monthStart(new Date(view.getFullYear(), view.getMonth() + 1, 1)) <= today

  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const popStyle: React.CSSProperties = narrow
    ? { position: 'fixed', top: pos.top, bottom: pos.bottom, left: 12, right: 12, maxHeight: pos.maxHeight }
    : { position: 'fixed', top: pos.top, bottom: pos.bottom, right: Math.max(12, pos.right), maxHeight: pos.maxHeight }

  return (
    <div className="inline-block">
      <button
        ref={anchor}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={`flex h-10 cursor-pointer items-center gap-2.5 rounded-full border bg-white pl-4 pr-3.5 text-[13px] font-semibold text-ink shadow-sm outline-none transition-all dark:bg-[#34353a] ${open ? 'border-brand shadow-[0_0_0_3px_rgba(239,83,80,0.15)]' : 'border-transparent hover:border-brand/50'}`}
      >
        <CalendarDays size={16} aria-hidden className="text-brand" />
        {label}
        <ChevronDown size={15} aria-hidden className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div ref={pop} role="dialog" aria-label="Choose date range" style={popStyle} className="z-[300] flex overflow-y-auto rounded-2xl border border-[#e3e3e8] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:border-[#55565d] dark:bg-[#34353a] max-sm:flex-col">
            <div className="w-[300px] p-4 max-sm:w-full">
              <div className="mb-3 flex items-center justify-between">
                <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-brand/10 hover:text-brand"><ChevronLeft size={17} aria-hidden /></button>
                <span className="text-[14px] font-extrabold text-ink">{view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                <button type="button" aria-label="Next month" disabled={!canNext} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={17} aria-hidden /></button>
              </div>
              <div className="grid grid-cols-7 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="pb-1.5 text-[11px] font-bold text-muted">{d}</span>)}
                {cells.map((d) => {
                  const outside = d.getMonth() !== view.getMonth()
                  const future = d > today
                  const isFrom = same(d, shown.from)
                  const isTo = same(d, shown.to)
                  const inside = d >= shown.from && d <= shown.to
                  const edge = isFrom || isTo
                  return (
                    <button
                      key={d.getTime()}
                      type="button"
                      disabled={future}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      aria-label={d.toDateString()}
                      aria-pressed={edge}
                      className={`h-9 cursor-pointer border-0 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                        edge ? 'bg-brand text-white' : inside ? 'bg-brand/10 text-brand dark:bg-brand/20' : 'bg-transparent text-ink hover:bg-black/5 dark:hover:bg-white/10'
                      } ${outside && !edge ? 'opacity-35' : ''} ${isFrom || !inside ? 'rounded-l-full' : ''} ${isTo || !inside ? 'rounded-r-full' : ''} ${same(d, today) && !edge ? 'ring-1 ring-inset ring-brand/60' : ''}`}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
              <p className="mb-0 mt-3 text-center text-[12px] text-muted">
                {start ? 'Now pick the end date' : `${rangeDays(value)} ${rangeDays(value) === 1 ? 'day' : 'days'} selected`}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

