import type { BasketItem } from '../components/Navbar/BasketMenu'
import type { WhatsAppSettings } from '../store/types'
import { formatINR } from './format'

export interface OrderCustomer {
  name: string
  shopName: string
  phone: string
  address?: string
  message?: string
}

export type OrderErrors = Partial<Record<'name' | 'shopName' | 'phone', string>>

export function validateOrderCustomer(c: OrderCustomer, needShop = true): OrderErrors {
  const e: OrderErrors = {}
  if (!c.name.trim()) e.name = 'Enter your name'
  if (needShop && !c.shopName.trim()) e.shopName = 'Enter your shop name'
  if (c.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number'
  return e
}

export const basketTotal = (items: BasketItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0)

export interface MessageBusiness {
  name: string
  address: string
  phone: string
  email?: string
  hours?: string
}

const DIVIDERS = { line: '━━━━━━━━━━━━━━━━', dots: '• • • • • • • • • •', none: '' } as const

/** Customer name for lists: shop name, else person name, else "Walk-in customer". */
export const customerLabel = (c: { name?: string; shopName?: string }) => c.shopName?.trim() || c.name?.trim() || 'Walk-in customer'

/**
 * The WhatsApp order message:
 *  1. the shop's details,  2. order number / date / customer (only what was filled in),
 *  3. every item with quantity × price = line total,  4. the price calculation and the final total.
 */
interface MessageOptions {
  /** One line per item instead of two. */
  compact?: boolean
  /** List only the first N items (the total still covers everything). */
  maxItems?: number
}

function buildMessage(items: BasketItem[], biz: MessageBusiness, wa: WhatsAppSettings, orderId: string | undefined, when: Date, opt: MessageOptions): string {
  const units = items.reduce((n, i) => n + i.qty, 0)
  const total = basketTotal(items)
  const mrpTotal = items.reduce((n, i) => n + i.qty * (i.mrp ?? i.price), 0)
  const savings = mrpTotal - total
  const date = when.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const compact = opt.compact || wa.itemStyle === 'compact'
  const divider = DIVIDERS[wa.divider]
  const e = (emoji: string, word: string) => (wa.emojis ? `${emoji} ` : `${word}: `)

  const shop = [
    wa.showShopName && biz.name ? `*${biz.name}*` : '',
    wa.showAddress && biz.address ? `${e('📍', 'Address')}${biz.address}` : '',
    wa.showPhone && biz.phone ? `${e('📞', 'Phone')}${biz.phone}` : '',
    wa.showHours && biz.hours ? `${e('🕘', 'Hours')}${biz.hours}` : '',
  ].filter(Boolean)
  const shown = opt.maxItems ? items.slice(0, opt.maxItems) : items
  const lines = shown.map((i, n) =>
    compact
      ? `${n + 1}. ${i.name} — ${i.qty} × ${formatINR(i.price)} = ${formatINR(i.qty * i.price)}`
      : `${n + 1}. ${i.name} (${i.company}, ${i.size})\n    ${i.qty} × ${formatINR(i.price)} = ${formatINR(i.qty * i.price)}`,
  )
  if (shown.length < items.length) {
    const more = items.length - shown.length
    lines.push(`…and ${more} more ${more === 1 ? 'item' : 'items'}${orderId ? ` (full list in order ${orderId})` : ''}`)
  }

  const block = (...parts: (string | string[] | false)[]) => parts.flat().filter((x): x is string => typeof x === 'string' && x !== '')
  const sep = divider ? [divider] : ['']
  const out: string[] = [
    ...(wa.intro.trim() ? [wa.intro.trim(), ''] : []),
    ...shop,
    ...(shop.length ? sep : []),
    ...block(`*${wa.orderLabel.trim() || 'ORDER'}${orderId ? ` ${orderId}` : ''}*`, wa.showDate && `Date: ${date}`),
    '',
    wa.showCounts ? `*Items (${items.length}) — ${units} ${units === 1 ? 'unit' : 'units'}*` : '*Items*',
    ...lines,
    ...sep,
    ...(wa.showDiscount && savings > 0 ? [`Subtotal: ${formatINR(mrpTotal)}`, `Discount: − ${formatINR(savings)}`] : wa.showDiscount ? [`Subtotal: ${formatINR(total)}`] : []),
    `*${wa.totalLabel.trim() || 'TOTAL'}: ${formatINR(total)}*`,
    ...(wa.note.trim() || wa.closing.trim() ? [...sep, ...block(wa.note.trim(), wa.closing.trim())] : []),
  ]
  // Trim stray blank lines at the very start/end and collapse doubles.
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** WhatsApp links break when they get too long, so shrink the message (never the total) until it fits. */
const MAX_ENCODED = 3000

/** The full order message; automatically shortened for very long baskets so the WhatsApp link still works. */
export function buildBasketMessage(items: BasketItem[], biz: MessageBusiness, wa: WhatsAppSettings, orderId?: string, when: Date = new Date()): string {
  const fits = (t: string) => encodeURIComponent(t).length <= MAX_ENCODED
  let msg = buildMessage(items, biz, wa, orderId, when, {})
  if (fits(msg)) return msg
  msg = buildMessage(items, biz, wa, orderId, when, { compact: true })
  if (fits(msg)) return msg
  for (let n = items.length - 1; n >= 1; n--) {
    msg = buildMessage(items, biz, wa, orderId, when, { compact: true, maxItems: n })
    if (fits(msg)) return msg
  }
  return msg
}

export function buildEnquiryMessage(c: OrderCustomer): string {
  return [
    '*NEW ENQUIRY*',
    '',
    `Name: ${c.name}`,
    ...(c.shopName.trim() ? [`Shop: ${c.shopName.trim()}`] : []),
    `Contact: ${c.phone}`,
    ...(c.message?.trim() ? ['', c.message.trim()] : []),
  ].join('\n')
}
