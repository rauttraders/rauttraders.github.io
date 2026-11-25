import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopover } from './usePopover'

export interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  /** `field`: form input with a label above · `pill`: toolbar filter · `badge`: compact coloured chip (pass `badgeClass`). */
  variant?: 'field' | 'pill' | 'badge'
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  ariaLabel?: string
  badgeClass?: string
  className?: string
}

const TRIGGER = {
  field: 'h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-ink dark:bg-[#2b2c30] max-md:h-[38px] max-md:px-3 max-md:text-[13px]',
  pill: 'h-10 rounded-full border border-transparent bg-white pl-4 pr-3 text-[13px] font-semibold text-ink dark:bg-[#34353a] max-md:h-9 max-md:pl-3 max-md:pr-2.5 max-md:text-[12px]',
  badge: 'h-8 rounded-full border-0 pl-3.5 pr-2.5 text-[12px] font-bold max-md:h-7 max-md:text-[11px]',
}

/** Styled dropdown that replaces the browser's native <select>. */
export default function Select({ value, onChange, options, variant = 'field', label, hint, error, placeholder = 'Select…', ariaLabel, badgeClass = '', className = '' }: SelectProps) {
  const { open, setOpen, anchor, pop, pos } = usePopover<HTMLButtonElement>()
  const [active, setActive] = useState(0)
  const idx = options.findIndex((o) => o.value === value)
  const selected = options[idx]

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    anchor.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setActive(Math.max(0, idx))
        return setOpen(true)
      }
      setActive((i) => Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      if (options[active]) choose(options[active].value)
    }
  }

  const trigger = (
    <button
      ref={anchor}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel ?? label}
      onClick={() => { setActive(Math.max(0, idx)); setOpen((o) => !o) }}
      onKeyDown={onKeyDown}
      className={`flex cursor-pointer items-center justify-between gap-2 text-left outline-none transition-all focus-visible:shadow-[0_0_0_3px_rgba(239,83,80,0.2)] ${TRIGGER[variant]} ${variant === 'field' ? (error ? 'border-[#c62f2c]' : open ? 'border-brand shadow-[0_0_0_3px_rgba(239,83,80,0.15)]' : 'border-line hover:border-brand/60') : ''} ${variant === 'badge' ? badgeClass : ''}`}
    >
      <span className={`truncate ${!selected && variant === 'field' ? 'text-muted' : ''}`}>{selected?.label ?? placeholder}</span>
      <ChevronDown size={variant === 'badge' ? 13 : 16} aria-hidden className={`shrink-0 transition-transform ${variant === 'badge' ? '' : 'text-muted'} ${open ? 'rotate-180' : ''}`} />
    </button>
  )

  return (
    <div className={`${variant === 'field' ? 'flex flex-col gap-1.5' : 'inline-block'} ${className}`}>
      {label && <span className="text-xs font-semibold text-muted">{label}</span>}
      {trigger}
      {hint && !error && <span className="text-[11px] text-muted">{hint}</span>}
      {error && <span className="text-xs font-medium text-[#c62f2c]">{error}</span>}

      {open &&
        createPortal(
          <div
            ref={pop}
            role="listbox"
            aria-label={ariaLabel ?? label}
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, minWidth: Math.max(pos.width, 170), maxHeight: Math.min(pos.maxHeight, 300) }}
            className="z-[300] overflow-y-auto rounded-xl border border-[#e3e3e8] bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)] dark:border-[#55565d] dark:bg-[#34353a]"
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => { e.stopPropagation(); choose(o.value) }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] ${i === active ? 'bg-brand/10' : ''} ${o.value === value ? 'font-bold text-brand' : 'font-medium text-ink'}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={14} aria-hidden className="shrink-0" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
