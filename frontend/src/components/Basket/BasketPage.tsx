import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from '../../store/StoreContext'
import { formatINR } from '../../lib/format'
import QtyInput from '../ui/QtyInput'
import type { BasketItem } from '../Navbar/BasketMenu'

interface BasketPageProps {
  items: BasketItem[]
  onClose: () => void
  onQty: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onBrowse: () => void
  onCheckout: () => void
}

const stepBtn =
  'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all hover:bg-brand hover:text-white active:scale-90 dark:bg-[#2b2c30] dark:hover:bg-brand max-md:h-7 max-md:w-7'

/** Full basket page: fills the viewport below the sticky navbar (which stays visible), with product photos. */
export default function BasketPage({ items, onClose, onQty, onRemove, onBrowse, onCheckout }: BasketPageProps) {
  const { brands } = useStore()
  const logoOf = new Map(brands.map((b) => [b.name, b.logo]))
  const count = items.reduce((s, i) => s + i.qty, 0)
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const mrpTotal = items.reduce((s, i) => s + i.qty * (i.mrp ?? i.price), 0)
  const savings = mrpTotal - total

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="basket-title" className="fixed inset-x-0 bottom-0 top-16 z-[900] flex flex-col bg-[#faf7f7] dark:bg-[#26272b] max-lg:top-14">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#ececf0] bg-white px-6 dark:border-[#45464c] dark:bg-[#34353a] max-lg:h-14 max-md:gap-2 max-md:px-3">
        <button type="button" onClick={onClose} aria-label="Back to shop" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-brand/10 hover:text-brand max-md:h-9 max-md:w-9">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h2 id="basket-title" className="m-0 flex items-center gap-2.5 text-[20px] font-extrabold text-ink max-md:gap-2 max-md:text-[16px]">
          My order
          {count > 0 && <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[13px] font-bold text-brand dark:bg-brand/20 max-md:px-2 max-md:text-[11px]">{count} {count === 1 ? 'item' : 'items'}</span>}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close my order" className="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-brand/10 hover:text-brand max-md:h-9 max-md:w-9">
          <X size={20} aria-hidden />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center max-md:px-4">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20 max-md:h-16 max-md:w-16">
            <ShoppingBag size={42} className="max-md:h-7 max-md:w-7" aria-hidden />
          </span>
          <h3 className="m-0 text-[22px] font-extrabold text-ink max-md:text-[18px]">You haven't added anything yet</h3>
          <p className="m-0 max-w-[340px] text-[15px] text-muted max-md:text-[13.5px]">Add the products you need and they'll show up here with the price worked out, ready to send on WhatsApp.</p>
          <button type="button" onClick={() => { onClose(); onBrowse() }} className="mt-2 h-[46px] cursor-pointer rounded-full border-0 bg-brand px-8 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-colors hover:bg-brand-hover max-md:h-[40px] max-md:px-6 max-md:text-[13px]">
            Browse products
          </button>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-6 overflow-y-auto p-6 max-lg:grid-cols-1 max-lg:gap-4 max-lg:p-4 max-md:gap-3 max-md:p-3">
          <ul className="m-0 flex h-fit list-none flex-col gap-4 p-0 max-md:gap-2.5">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 rounded-2xl border border-[#ececf0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:gap-3 max-md:rounded-xl max-md:p-3">
                <div className="flex h-[110px] w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-cream to-white dark:from-[#3d3e44] dark:to-[#34353a] max-md:h-[80px] max-md:w-[80px]">
                  {i.image ? (
                    <img src={i.image} alt={i.name} draggable={false} className={`h-full w-full object-contain ${i.isLogo ? 'logo-outline p-6 max-md:p-3' : 'p-2 max-md:p-1.5'}`} />
                  ) : (
                    <ShoppingBag size={32} className="text-muted max-md:h-6 max-md:w-6" aria-hidden />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-[#c62f2c] dark:bg-brand/20 dark:text-[#ff8a87] max-md:px-2 max-md:text-[10px]">{logoOf.get(i.company) && <img src={logoOf.get(i.company)} alt="" draggable={false} className="logo-outline h-3.5 w-auto max-w-[40px] shrink-0 object-contain" />}{i.company}</span>
                  <h3 className="m-0 mt-1.5 text-[16px] font-bold leading-snug text-ink max-md:mt-1 max-md:text-[14px]">{i.name}</h3>
                  <p className="m-0 mt-0.5 text-[13px] text-muted max-md:text-[11.5px]">{i.size} · {i.qty} × {formatINR(i.price)} = <b className="text-ink">{formatINR(i.price * i.qty)}</b></p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 max-md:gap-2 max-md:pt-2">
                    <div className="flex items-center gap-1 rounded-full bg-brand/10 p-1 dark:bg-brand/20">
                      <button type="button" aria-label={`Remove one ${i.name}`} onClick={() => onQty(i.id, i.qty - 1)} className={stepBtn}>
                        <Minus size={15} strokeWidth={2.75} />
                      </button>
                      <QtyInput value={i.qty} onCommit={(n) => onQty(i.id, n)} label={`Quantity of ${i.name}`} className="h-8 w-14 text-[15px] max-md:h-7 max-md:w-11 max-md:text-[13px]" />
                      <button type="button" aria-label={`Add one more ${i.name}`} onClick={() => onQty(i.id, i.qty + 1)} className={stepBtn}>
                        <Plus size={15} strokeWidth={2.75} />
                      </button>
                    </div>
                    <span className="text-[19px] font-extrabold text-brand max-md:text-[16px]">{formatINR(i.price * i.qty)}</span>
                    <button type="button" aria-label={`Remove ${i.name} from basket`} title="Remove from basket" onClick={() => onRemove(i.id)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-[#fdeaea] text-[#c62f2c] transition-colors hover:bg-[#c62f2c] hover:text-white dark:bg-[#4a2f2f] dark:text-[#ff8a87] dark:hover:bg-[#c62f2c] dark:hover:text-white max-md:h-8 max-md:w-8">
                      <Trash2 size={17} className="max-md:h-4 max-md:w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-[#ececf0] bg-white p-6 shadow-[0_14px_40px_rgba(239,83,80,0.12)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-lg:p-5 max-md:rounded-xl max-md:p-4 lg:sticky lg:top-0">
            <h3 className="m-0 text-[18px] font-extrabold text-ink max-md:text-[16px]">Order summary</h3>
            <dl className="m-0 mt-4 flex flex-col gap-3 text-[14px] max-md:mt-3 max-md:gap-2 max-md:text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">Products</dt><dd className="m-0 font-semibold text-ink">{items.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Units</dt><dd className="m-0 font-semibold text-ink">{count}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{savings > 0 ? 'Subtotal' : 'Items total'}</dt><dd className="m-0 font-semibold text-ink">{formatINR(mrpTotal)}</dd></div>
              {savings > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="m-0 font-semibold text-[#2e9e55]">− {formatINR(savings)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="m-0 font-semibold text-ink">Confirmed on WhatsApp</dd></div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-[#d8d8df] pt-4 dark:border-[#55565d] max-md:mt-3 max-md:pt-3">
              <span className="text-[15px] font-bold text-ink max-md:text-[14px]">Total</span>
              <span className="text-[26px] font-extrabold text-brand max-md:text-[21px]">{formatINR(total)}</span>
            </div>
            <button type="button" onClick={onCheckout} className="mt-5 flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-all hover:bg-brand-hover active:scale-[0.99] max-md:mt-4 max-md:h-[42px] max-md:text-[13px]">
              Review &amp; send order
              <span aria-hidden className="h-5 w-px bg-white/50" />
              <MessageCircle size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => { onClose(); onBrowse() }} className="mt-3 h-[46px] w-full cursor-pointer rounded-full border-0 bg-brand/10 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white dark:bg-brand/20 max-md:mt-2.5 max-md:h-[40px] max-md:text-[13px]">
              Continue shopping
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}
