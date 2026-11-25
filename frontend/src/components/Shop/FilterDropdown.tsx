import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  icon: ReactNode
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export default function FilterDropdown({ label, icon, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value))
  const selected = options[selectedIdx]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setActive(selectedIdx)
        return setOpen(true)
      }
      setActive((i) => Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      choose(options[active].value)
    }
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActive(selectedIdx)
          setOpen((o) => !o)
        }}
        onKeyDown={onKeyDown}
        className="flex h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white pl-3.5 pr-3 text-left transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand dark:bg-[#34353a]"
      >
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">{selected?.label}</span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 m-0 max-h-[280px] list-none overflow-y-auto rounded-lg border border-[#e3e3e8] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-[#55565d] dark:bg-[#34353a]"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                i === active ? 'bg-brand/10' : ''
              } ${o.value === value ? 'font-bold text-brand' : 'font-medium text-ink'}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={15} aria-hidden className="shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
