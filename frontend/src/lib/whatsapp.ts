import type { CartLine, Customer } from '../types'
import { formatINR } from './format'

export const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? '917507425887'

export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.product.price * l.qty, 0)

export function buildOrderMessage(customer: Customer, lines: CartLine[]): string {
  const items = lines
    .map((l, i) => `${i + 1}. ${l.product.name} (${l.product.size})\n   ${l.qty} x ${formatINR(l.product.price)} = ${formatINR(l.qty * l.product.price)}`)
    .join('\n')
  return [
    '*NEW ORDER*',
    '',
    `Name: ${customer.name}`,
    `Shop: ${customer.shopName}`,
    `Contact: ${customer.phone}`,
    '',
    '*Items*',
    items,
    '',
    `*Total: ${formatINR(cartTotal(lines))}*`,
  ].join('\n')
}

export const whatsappUrl = (message: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

export function validateCustomer(c: Customer): Partial<Record<keyof Customer, string>> {
  const e: Partial<Record<keyof Customer, string>> = {}
  if (!c.name.trim()) e.name = 'Enter your name'
  if (!c.shopName.trim()) e.shopName = 'Enter your shop name'
  if (!/^\d{10}$/.test(c.phone.replace(/\D/g, '').slice(-10)) || c.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number'
  return e
}
