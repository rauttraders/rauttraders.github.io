import { MessageCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { formatINR } from '../../lib/format'
import { buildOrderMessage, validateCustomer, whatsappUrl } from '../../lib/whatsapp'

export default function WhatsAppBar() {
  const { lines, itemCount, total, customer } = useCart()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const send = () => {
    if (Object.keys(validateCustomer(customer)).length > 0) {
      navigate('/cart', { state: { showErrors: true } })
      return
    }
    window.open(whatsappUrl(buildOrderMessage(customer, lines)), '_blank', 'noopener')
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-[#F0F0F0] bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 md:px-10">
        <button
          type="button"
          onClick={() => pathname !== '/cart' && navigate('/cart')}
          className="cursor-pointer border-0 bg-transparent p-0 text-left"
          aria-label="View cart"
        >
          <span className="block text-xs text-muted">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
          <span className="block text-base font-semibold text-ink">{formatINR(total)}</span>
        </button>
        <button
          type="button"
          onClick={send}
          disabled={itemCount === 0}
          className="flex h-12 cursor-pointer items-center gap-2 rounded-[28px] border-0 bg-brand px-6 text-sm font-semibold uppercase text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 max-sm:px-4 max-sm:text-xs"
        >
          <MessageCircle size={18} aria-hidden /> Send order on WhatsApp
        </button>
      </div>
    </div>
  )
}
