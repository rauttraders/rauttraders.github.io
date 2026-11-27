/**
 * OrderReceipt – Premium reusable receipt component.
 * Used in both the customer order confirmation and the admin orders panel.
 *
 * Design system: Raut Traders – Nunito font, brand red #ef5350, white card surface.
 * Zigzag edges via inline SVG, print-safe CSS (@media print handled by index.css).
 */

import { formatINR } from '../../lib/format'
import type { OrderItem } from '../../store/types'
import { useLanguage } from '../../hooks/useLanguage'
import logoUrl from '../../assets/sortlogo.png'

export interface ReceiptOrder {
  id: string
  createdAt: string
  items: OrderItem[]
  total: number
}

interface Props {
  order: ReceiptOrder
  businessName?: string
  businessPhone?: string
  businessAddress?: string
}

/** Zigzag SVG strip – creates the perforated ticket edge effect */
function ZigzagEdge({ flip = false }: { flip?: boolean }) {
  // 20px teeth across a 420px wide strip
  const w = 420
  const h = 14
  const teeth = 21
  const tw = w / teeth
  const points: string[] = [`0,${flip ? 0 : h}`]
  for (let i = 0; i < teeth; i++) {
    const x1 = i * tw + tw / 2
    const x2 = (i + 1) * tw
    points.push(`${x1},${flip ? h : 0}`)
    points.push(`${x2},${flip ? 0 : h}`)
  }
  points.push(`${w},${flip ? 0 : h}`)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: h, display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      <polygon points={points.join(' ')} fill="white" />
    </svg>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Delivery box SVG illustration – wholesale / logistics themed */
function BoxIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect width="52" height="52" rx="12" fill="#fff4f4" />
      {/* box body */}
      <rect x="10" y="22" width="32" height="20" rx="2" fill="#ef5350" opacity=".15" />
      <rect x="10" y="22" width="32" height="20" rx="2" stroke="#ef5350" strokeWidth="1.5" fill="none" />
      {/* box lid */}
      <path d="M8 22h36v-4a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v4z" fill="#ef5350" opacity=".25" stroke="#ef5350" strokeWidth="1.5" />
      {/* tape stripe */}
      <rect x="22" y="16" width="8" height="6" rx="1" fill="#ef5350" opacity=".5" />
      {/* horizontal label stripe on body */}
      <rect x="14" y="30" width="24" height="5" rx="1" fill="#ef5350" opacity=".2" />
      {/* lines on label */}
      <rect x="16" y="31.5" width="8" height="1.5" rx="0.75" fill="#ef5350" opacity=".5" />
      <rect x="16" y="34" width="12" height="1" rx="0.5" fill="#ef5350" opacity=".35" />
    </svg>
  )
}

export default function OrderReceipt({ order, businessName = 'Raut Traders', businessPhone, businessAddress }: Props) {
  const { t } = useLanguage()
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <div
      id="printable-receipt"
      style={{ fontFamily: "'Nunito', sans-serif" }}
      className="mx-auto w-full max-w-[420px] select-none"
    >
      {/* ── Brand strip with top zigzag ───────────────────────── */}
      <div className="bg-brand px-6 pb-0 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="text-[15px] font-extrabold tracking-wide text-white">{businessName}</span>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">
            {t('receiptLabel')}
          </span>
        </div>
        <div className="mt-3" />
        <ZigzagEdge />
      </div>

      {/* ── White receipt body ───────────────────────────────── */}
      <div className="bg-white px-6 py-0">

        {/* Header block */}
        <div className="flex items-center justify-between gap-3 py-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {/* Green confirmed badge */}
              <span className="inline-flex items-center rounded-full bg-[#e6f9f1] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1baf7a]">
                {t('confirmed')}
              </span>
            </div>
            <h2 className="m-0 text-[18px] font-extrabold leading-tight text-[#111]">
              {t('orderPlaced')}
            </h2>
            <p className="m-0 mt-0.5 text-[12px] text-[#596579]">{t('thankYouOrder')}</p>
          </div>
          <BoxIllustration />
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-[#ececf0]" />

        {/* Order info table */}
        <div className="py-4">
          <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#596579]">{t('orderDetails')}</p>
          <div className="grid grid-cols-2 gap-y-2.5 text-[13px]">
            <span className="text-[#596579]">{t('orderId')}</span>
            <span className="text-right font-bold text-brand">{order.id}</span>

            <span className="text-[#596579]">{t('dateTime')}</span>
            <span className="text-right font-semibold text-[#111]">{fmt(order.createdAt)}</span>

            <span className="text-[#596579]">{t('status')}</span>
            <span className="text-right font-semibold text-[#1baf7a]">{t('confirmed')}</span>
          </div>
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-[#ececf0]" />

        {/* Items table */}
        <div className="py-4">
          <p className="m-0 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#596579]">{t('itemsOrdered')}</p>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[#596579]">
                <th className="pb-2 text-left font-semibold">{t('product')}</th>
                <th className="pb-2 text-center font-semibold">{t('qty')}</th>
                <th className="pb-2 text-right font-semibold">{t('rate')}</th>
                <th className="pb-2 text-right font-semibold">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}>
                  <td className="py-2 pr-2 text-[#111]">
                    <span className="block font-semibold leading-tight">{item.name}</span>
                    <span className="block text-[11px] text-[#596579]">{item.company}{item.size && item.size !== '0' ? ` · ${item.size}` : ''}</span>
                  </td>
                  <td className="py-2 text-center font-semibold text-[#111]">{item.qty}</td>
                  <td className="py-2 text-right text-[#596579]">{formatINR(item.price)}</td>
                  <td className="py-2 text-right font-bold text-[#111]">{formatINR(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-[#ececf0]" />

        {/* Payment summary */}
        <div className="py-4">
          <p className="m-0 mb-3 text-[10px] font-bold uppercase tracking-widest text-[#596579]">{t('paymentSummary')}</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#596579]">{t('subtotal')} ({order.items.reduce((s, i) => s + i.qty, 0)} {t('itemsLabel')})</span>
              <span className="font-semibold text-[#111]">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#596579]">{t('delivery')}</span>
              <span className="font-semibold text-[#1baf7a]">{t('agreedOnWa')}</span>
            </div>
          </div>
          {/* Grand total */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fff4f4] px-4 py-3">
            <span className="text-[14px] font-bold text-[#111]">{t('total')}</span>
            <span className="text-[20px] font-extrabold text-brand">{formatINR(order.total)}</span>
          </div>
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-[#ececf0]" />

        {/* Footer */}
        <div className="py-5 text-center">
          {/* Pseudo-barcode using order ID chars as bars */}
          <div className="mb-3 flex items-end justify-center gap-[2px]" aria-hidden>
            {Array.from(order.id.replace(/\W/g, '')).map((ch, i) => {
              const h = 16 + ((ch.charCodeAt(0) * 7 + i * 3) % 20)
              const w = i % 3 === 0 ? 3 : i % 3 === 1 ? 1.5 : 2
              return <div key={i} style={{ width: w, height: h, background: '#111', borderRadius: 1 }} />
            })}
          </div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-[#596579]">{order.id}</p>
          <p className="m-0 mt-3 text-[13px] font-semibold text-[#111]">🙏 {t('receiptThanks')}</p>
          <p className="m-0 mt-1 text-[11px] text-[#596579]">{t('receiptWaNote')}</p>
          {businessPhone && (
            <p className="m-0 mt-1 text-[11px] text-[#596579]">{t('queriesCall')} {businessPhone}</p>
          )}
          {businessAddress && (
            <p className="m-0 mt-1 text-[11px] text-[#596579]">{businessAddress}</p>
          )}
          <p className="m-0 mt-3 text-[10px] text-[#b4b4b8]">{businessName} · Powered by Raut Traders</p>
        </div>
      </div>

      {/* ── Bottom zigzag strip ─────────────────────────────── */}
      <div className="bg-brand px-6 pb-4 pt-0">
        <ZigzagEdge flip />
      </div>
    </div>
  )
}
