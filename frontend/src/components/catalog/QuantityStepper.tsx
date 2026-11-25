import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  qty: number
  onChange: (qty: number) => void
  /** Show an ADD button when qty is 0 (catalogue cards). */
  addButton?: boolean
}

export default function QuantityStepper({ qty, onChange, addButton = false }: QuantityStepperProps) {
  if (addButton && qty === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        className="h-9 w-full cursor-pointer rounded-full bg-brand text-xs font-semibold uppercase text-white shadow-[0_3px_10px_rgba(239,83,80,0.3)] transition-colors hover:bg-brand-hover"
      >
        Add
      </button>
    )
  }
  const btn = 'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#111] hover:bg-cream-2 disabled:opacity-40'
  return (
    <div className="flex h-9 items-center justify-between rounded-full border border-brand bg-white">
      <button type="button" aria-label="Decrease quantity" className={btn} onClick={() => onChange(qty - 1)} disabled={qty <= 0}>
        <Minus size={15} />
      </button>
      <input
        aria-label="Quantity"
        inputMode="numeric"
        value={qty}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
        className="w-10 border-0 bg-transparent text-center text-sm font-semibold text-ink outline-none"
      />
      <button type="button" aria-label="Increase quantity" className={btn} onClick={() => onChange(qty + 1)}>
        <Plus size={15} />
      </button>
    </div>
  )
}
