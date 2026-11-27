/**
 * ReceiptDialog – centred modal wrapper for OrderReceipt.
 * Used by both customer OrderModal and admin OrdersPage.
 * Print: window.print() shows only #printable-receipt (see index.css @media print).
 */
import { createPortal } from 'react-dom'
import { MessageCircle, X, Printer } from 'lucide-react'
import OrderReceipt, { type ReceiptOrder } from './OrderReceipt'
import { useStore } from '../../store/StoreContext'
import { useLanguage } from '../../hooks/useLanguage'
import { buildBasketMessage } from '../../lib/order'
import { whatsappUrl } from '../../lib/links'

interface Props {
  order: ReceiptOrder
  onClose: () => void
}

export default function ReceiptDialog({ order, onClose }: Props) {
  const { settings } = useStore()
  const { t } = useLanguage()

  const handlePrint = () => window.print()
  const waText = buildBasketMessage(
    order.items.map((i) => ({
      id: i.id,
      name: i.name,
      company: i.company,
      size: i.size,
      price: i.price,
      qty: i.qty,
    })),
    settings.business,
    settings.whatsapp,
    order.id,
    new Date(order.createdAt),
  )
  const waHref = whatsappUrl(settings, waText)

  return createPortal(
    <div
      className="receipt-portal-root fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="Order Receipt"
    >
      <div className="receipt-dialog-card flex w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-[#f5f5f5] shadow-[0_20px_60px_rgba(0,0,0,0.35)] dark:bg-[#26272b]"
        style={{ maxHeight: '90vh' }}>

        {/* Dialog header */}
        <div className="no-print flex shrink-0 items-center justify-between gap-2 border-b border-[#ececf0] bg-white px-5 py-3.5 dark:border-[#45464c] dark:bg-[#34353a] max-sm:px-3.5">
          <span className="truncate text-[14px] font-bold text-[#111] dark:text-[#f3f3f3]">{t('orderReceipt')}</span>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[#25D366]/15 px-3.5 text-[12.5px] font-semibold text-[#15803d] no-underline transition-colors hover:bg-[#25D366] hover:text-white dark:bg-[#25D366]/20 dark:text-[#4ade80] dark:hover:text-white max-sm:px-3"
              title={t('sendOnWhatsApp')}
            >
              {t('whatsappLabel')} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <MessageCircle size={14} aria-hidden />
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-brand/10 px-4 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white dark:bg-brand/20 max-sm:px-3"
              title={t('print')}
            >
              {t('print')} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <Printer size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#596579] transition-colors hover:bg-black/5 dark:hover:bg-white/10 dark:text-[#b4b4b8]"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        {/* Scrollable receipt */}
        <div className="receipt-dialog-scroll overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <OrderReceipt
            order={order}
            businessName={settings.business.name}
            businessPhone={settings.business.phone}
            businessAddress={settings.business.address}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
