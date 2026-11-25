import { ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import BasketPage from '../Basket/BasketPage'

export interface BasketItem {
  id: string
  name: string
  company: string
  size: string
  price: number
  qty: number
  image?: string
  isLogo?: boolean
  mrp?: number
}

export interface BasketMenuProps {
  items: BasketItem[]
  /** Fallback count when `items` isn't provided. */
  count?: number
  onRemove?: (id: string) => void
  onQty?: (id: string, qty: number) => void
  /** "Browse products" action shown in the basket's empty state / footer. */
  onBrowse?: () => void
  /** "Place order" action; opens the order form. */
  onCheckout?: () => void
  showLabel?: boolean
  /** Optional: control whether the "My order" page is open from outside (e.g. the hero button). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** MY ORDER action: the icon opens a full-screen page listing what was chosen, with the calculated total. */
export default function BasketMenu({ items, count, onRemove, onQty, onBrowse, onCheckout, open: openProp, onOpenChange }: BasketMenuProps) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  const badge = items.length > 0 ? items.reduce((s, i) => s + i.qty, 0) : (count ?? 0)

  return (
    <>
      <button
        type="button"
        title="My order"
        aria-label={`My order${badge ? `, ${badge} items` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span className="relative flex">
          <ShoppingCart size={20} aria-hidden />
          {badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{badge}</span>
          )}
        </span>
      </button>

      {open &&
        // Portal to <body>: the sticky header's backdrop-filter would otherwise trap a fixed full-screen page inside it.
        createPortal(
        <BasketPage
          items={items}
          onClose={() => setOpen(false)}
          onQty={(id, q) => onQty?.(id, q)}
          onRemove={(id) => onRemove?.(id)}
          onBrowse={() => setTimeout(() => onBrowse?.(), 60)}
          onCheckout={() => onCheckout?.()}
        />,
        document.body,
        )}
    </>
  )
}
