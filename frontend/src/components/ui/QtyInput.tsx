import { useState } from 'react'

interface QtyInputProps {
  value: number
  /** Called with a whole number from 1 to `max`. */
  onCommit: (n: number) => void
  label: string
  max?: number
  className?: string
}

/** Editable quantity: type a number (Enter or leaving the field applies it), or use the ↑ ↓ keys. */
export default function QtyInput({ value, onCommit, label, max = 999, className = '' }: QtyInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    const n = parseInt(draft ?? '', 10)
    setDraft(null)
    // Empty or 0 keeps the old quantity — removing an item is done with the minus / delete buttons.
    if (Number.isFinite(n) && n >= 1 && n !== value) onCommit(Math.min(n, max))
    else if (Number.isFinite(n) && n > max) onCommit(max)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      value={draft ?? String(value)}
      maxLength={3}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const next = Math.min(max, Math.max(1, (parseInt(draft ?? '', 10) || value) + (e.key === 'ArrowUp' ? 1 : -1)))
          setDraft(null)
          onCommit(next)
        }
      }}
      className={`min-w-0 rounded-full border-0 bg-transparent p-0 text-center font-extrabold text-brand outline-none transition-colors focus:bg-white focus:shadow-[0_0_0_2px_#ef5350] dark:focus:bg-[#2b2c30] ${className}`}
    />
  )
}
