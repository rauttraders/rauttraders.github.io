/**
 * ReceiptDialog – centred modal wrapper for OrderReceipt.
 * Used by both customer OrderModal and admin OrdersPage.
 * Print: window.print() shows only #printable-receipt (see index.css @media print).
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, MessageCircle, X } from 'lucide-react'
import OrderReceipt, { type ReceiptOrder } from './OrderReceipt'
import { useStore } from '../../store/StoreContext'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../ui/Toast'
import { buildBasketMessage } from '../../lib/order'
import { whatsappUrl } from '../../lib/links'
import { generateReceiptPdfFile } from '../../lib/receiptPdf'

interface Props {
  order: ReceiptOrder
  onClose: () => void
}

function triggerDownload(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function ReceiptDialog({ order, onClose }: Props) {
  const { settings } = useStore()
  const { t } = useLanguage()
  const toast = useToast()
  const [sharingWa, setSharingWa] = useState(false)
  const [downloading, setDownloading] = useState(false)

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

  const makePdf = () =>
    generateReceiptPdfFile(order, {
      businessName: settings.business.name,
      businessPhone: settings.business.phone,
      businessAddress: settings.business.address,
    })

  const handleDownloadPdf = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const file = await makePdf()
      triggerDownload(file)
      toast.success(`Downloaded ${file.name}`)
    } catch {
      toast.error('Could not download receipt PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const sharePdfToWhatsApp = async () => {
    if (sharingWa) return
    setSharingWa(true)
    try {
      const file = await makePdf()

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt ${order.id}`,
          text: waText,
        })
        return
      }

      // Desktop / unsupported browsers: download the actual PDF file and open WhatsApp to attach it
      triggerDownload(file)
      toast.info(`Downloaded ${file.name} — attach it in WhatsApp`)
      window.open(waHref, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Could not prepare PDF receipt. Opening WhatsApp message instead.')
      window.open(waHref, '_blank', 'noopener,noreferrer')
    } finally {
      setSharingWa(false)
    }
  }

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
            <button
              type="button"
              disabled={sharingWa}
              onClick={() => void sharePdfToWhatsApp()}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[#25D366]/15 px-3.5 text-[12.5px] font-semibold text-[#15803d] transition-colors hover:bg-[#25D366] hover:text-white disabled:cursor-wait disabled:opacity-60 dark:bg-[#25D366]/20 dark:text-[#4ade80] dark:hover:text-white max-sm:px-3"
              title={t('sendOnWhatsApp')}
            >
              {sharingWa ? t('sending') : t('whatsappLabel')} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <MessageCircle size={14} aria-hidden />
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-brand/10 px-4 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:cursor-wait disabled:opacity-60 dark:bg-brand/20 max-sm:px-3"
              title={t('downloadLabel')}
            >
              {t('downloadLabel')} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <Download size={14} aria-hidden />
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
