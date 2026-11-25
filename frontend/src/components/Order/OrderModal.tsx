import { CheckCircle2, Copy, Globe, MessageCircle, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { whatsappUrl, whatsappWebUrl } from '../../lib/links'
import { basketTotal, buildBasketMessage } from '../../lib/order'
import { useStore } from '../../store/StoreContext'
import type { BasketItem } from '../Navbar/BasketMenu'

/** A random 128-bit key (works on plain http too, where crypto.randomUUID is not available). */
function newOrderKey(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

interface OrderModalProps {
  items: BasketItem[]
  onClose: () => void
  /** Called once the order has been placed and the customer closes the confirmation (clears the basket). */
  onSent: () => void
}

interface Placed {
  id?: string
  total: number
  /** The order message text (for "Copy message"). */
  text: string
  waUrl: string
  webUrl: string
  /** False when the shop's server couldn't be reached: the WhatsApp message still works, but nothing is in the admin panel. */
  saved: boolean
}

/**
 * Confirm step: shows the items and total, then on one tap
 *  - saves the order for the admin panel, and
 *  - opens a WhatsApp chat with the shop's number with the full order message ready to send.
 */
export default function OrderModal({ items, onClose, onSent }: OrderModalProps) {
  const { settings, placeOrder } = useStore()
  const [busy, setBusy] = useState(false)
  // One key for this order. If the connection drops and the shop taps again, the same key is sent, so only one order is made.
  const orderKey = useRef(newOrderKey())
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState<Placed | null>(null)
  const [copied, setCopied] = useState(false)
  const total = basketTotal(items)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (placed ? onSent() : onClose())
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, onSent, placed])

  const submit = async () => {
    setBusy(true)
    setError('')
    // Open the chat tab right now, inside the tap, so the browser doesn't block it; it gets its address once the order is saved.
    const tab = window.open('', '_blank')
    let id: string | undefined
    let saved = true
    try {
      id = (await placeOrder({ key: orderKey.current, items: items.map((i) => ({ id: i.id, qty: i.qty })) })).id
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        tab?.close()
        setError(err.message)
        setBusy(false)
        return
      }
      saved = false // server unreachable: still send the WhatsApp message so the order isn't lost
    }
    const text = buildBasketMessage(items, settings.business, settings.whatsapp, id)
    const waUrl = whatsappUrl(settings, text)
    setPlaced({ id, total, text, waUrl, webUrl: whatsappWebUrl(settings, text), saved })
    setBusy(false)
    if (tab && !tab.closed) tab.location.href = waUrl
    else window.location.href = waUrl
  }

  const copy = async () => {
    if (!placed) return
    try {
      await navigator.clipboard.writeText(placed.text)
    } catch {
      const t = document.createElement('textarea')
      t.value = placed.text
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (placed) {
    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="order-done" className="w-full max-w-[420px] rounded-2xl bg-white p-7 text-center shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:bg-[#34353a] max-md:p-5">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full max-md:h-12 max-md:w-12 ${placed.saved ? 'bg-[#dff5e8] text-[#1c6b3c] dark:bg-[#1d3a2a] dark:text-[#7fd6a1]' : 'bg-[#fdf0d5] text-[#8a5a00] dark:bg-[#4a3a16] dark:text-[#f0c56b]'}`}>
            {placed.saved ? <CheckCircle2 size={34} className="max-md:h-6 max-md:w-6" aria-hidden /> : <TriangleAlert size={32} className="max-md:h-6 max-md:w-6" aria-hidden />}
          </span>
          <h2 id="order-done" className="mb-0 mt-4 text-xl font-semibold text-ink max-md:mt-3 max-md:text-lg">{placed.saved ? 'Order placed!' : 'Order ready on WhatsApp'}</h2>
          {placed.id && (
            <>
              <p className="mb-0 mt-1.5 text-[14px] text-muted max-md:text-[13px]">Your order number is</p>
              <p className="mb-0 mt-1 text-[26px] font-extrabold tracking-wide text-brand max-md:text-[22px]">{placed.id}</p>
            </>
          )}
          <p className="mb-0 mt-2 text-[13px] text-muted">
            {placed.saved
              ? `Total ${formatINR(placed.total)}. WhatsApp should have opened with your order — just press send. `
              : `Total ${formatINR(placed.total)}. The shop's order system couldn't be reached, so please make sure you press send in WhatsApp — that message is your order. `}
            {placed.saved && 'The shop will confirm delivery details with you on WhatsApp.'}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <a href={placed.waUrl} target="_blank" rel="noopener noreferrer" className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white no-underline shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-colors hover:bg-brand-hover">
              Open WhatsApp again <span aria-hidden className="h-5 w-px bg-white/50" /> <MessageCircle size={16} aria-hidden />
            </a>
            <div className="grid grid-cols-2 gap-2.5">
              <a href={placed.webUrl} target="_blank" rel="noopener noreferrer" title="For people using WhatsApp in a laptop or desktop browser" className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand/10 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white dark:bg-brand/20">
                WhatsApp Web <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <Globe size={14} aria-hidden />
              </a>
              <button type="button" onClick={() => void copy()} className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand/10 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white dark:bg-brand/20">
                {copied ? 'Copied ✓' : 'Copy message'} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <Copy size={14} aria-hidden />
              </button>
            </div>
            <p className="m-0 text-[11.5px] leading-snug text-muted">On a laptop? Use <b>WhatsApp Web</b>. No WhatsApp here? Copy the message and send it to {settings.business.phone} from your phone.</p>
            <button type="button" onClick={onSent} className="h-10 cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-muted hover:text-ink">Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-title" className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:bg-[#34353a] max-md:p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="order-title" className="m-0 text-xl font-semibold text-ink max-md:text-lg">Send your order</h2>
            <p className="mb-0 mt-1 text-[13px] text-muted max-md:text-[12px]">We'll open WhatsApp with your order written out — just press send. No personal details needed.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-black/5 dark:hover:bg-white/10">
            <X size={18} aria-hidden />
          </button>
        </div>

        <ul className="m-0 mt-4 max-h-[170px] list-none divide-y divide-[#ececf0] overflow-y-auto rounded-lg border border-[#ececf0] p-0 text-[13px] dark:divide-[#55565d] dark:border-[#55565d]">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-ink">{i.name} <span className="text-muted">× {i.qty}</span></span>
              <span className="shrink-0 font-semibold text-ink">{formatINR(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mb-0 mt-2 flex justify-between px-1 text-[15px] font-bold text-ink">
          <span>Total</span>
          <span className="text-brand">{formatINR(total)}</span>
        </p>

        {error && <p role="alert" className="mb-0 mt-4 rounded-xl bg-[#fdeaea] px-3 py-2 text-[13px] font-semibold text-[#c62f2c]">{error}</p>}
        <button type="button" disabled={busy} onClick={() => void submit()} className="mt-5 flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-all hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 max-md:mt-4 max-md:h-[42px] max-md:text-[13px]">
          {busy ? 'Sending…' : 'Send on WhatsApp'}
          <span aria-hidden className="h-5 w-px bg-white/50" />
          <MessageCircle size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
