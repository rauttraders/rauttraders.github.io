import { Link, useLocation } from 'react-router-dom'
import CartItemRow from '../components/cart/CartItemRow'
import { useCart } from '../context/CartContext'
import { formatINR } from '../lib/format'
import { validateCustomer } from '../lib/whatsapp'
import type { Customer } from '../types'

const fields: { key: keyof Customer; label: string; type?: string; inputMode?: 'tel' }[] = [
  { key: 'name', label: 'Your name' },
  { key: 'shopName', label: 'Shop name' },
  { key: 'phone', label: 'Contact number', type: 'tel', inputMode: 'tel' },
]

export default function CartPage() {
  const { lines, total, itemCount, setQty, remove, clear, customer, setCustomer } = useCart()
  const showErrors = (useLocation().state as { showErrors?: boolean } | null)?.showErrors
  const errors = validateCustomer(customer)

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[26px] font-light text-ink">Your cart is empty</h1>
        <Link to="/products" className="mt-4 inline-block rounded-[28px] bg-brand px-6 py-3 text-sm font-semibold uppercase text-[#111] no-underline">
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
      <section>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-light tracking-[-0.8px] text-ink">Review your order</h1>
          <button type="button" onClick={clear} className="cursor-pointer border-0 bg-transparent text-xs font-semibold text-muted hover:text-[#FF3F6C]">
            Clear cart
          </button>
        </div>
        <ul className="m-0 mt-2 list-none p-0">
          {lines.map((l) => (
            <CartItemRow key={l.product.id} line={l} onQty={setQty} onRemove={remove} />
          ))}
        </ul>
        <div className="flex items-center justify-between pt-4 text-base">
          <span className="text-muted">Total ({itemCount} items)</span>
          <span className="text-xl font-semibold text-ink">{formatINR(total)}</span>
        </div>
      </section>

      <section aria-label="Your details" className="h-fit rounded-md border border-[#F0F0F0] p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink">Your details</h2>
        <div className="space-y-4">
          {fields.map((f) => (
            <label key={f.key} className="block text-xs font-medium text-muted">
              {f.label}
              <input
                type={f.type ?? 'text'}
                inputMode={f.inputMode}
                value={customer[f.key]}
                onChange={(e) => setCustomer({ ...customer, [f.key]: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border-0 bg-[#F5F5F6] px-3 text-sm text-ink outline-none focus:shadow-[inset_0_0_0_1px_#D4D5D9]"
              />
              {showErrors && errors[f.key] && <span className="mt-1 block text-[11px] text-[#FF3F6C]">{errors[f.key]}</span>}
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Fill your details, then tap “Send order on WhatsApp” below.</p>
      </section>
    </div>
  )
}
