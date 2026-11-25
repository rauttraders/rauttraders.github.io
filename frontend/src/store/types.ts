export interface Category {
  id: string
  name: string
}

export interface Brand {
  id: string
  name: string
  /** Logo image URL or data URL (optional). */
  logo: string
}

export interface Slide {
  id: string
  /** Alt text / label. */
  title: string
  image: string
  /** Size multiplier for the image inside the slide (1 = fit). */
  scale: number
}

export interface Product {
  id: string
  name: string
  company: string
  categoryId: string
  description: string
  /** Pack size, e.g. "70 g" */
  size: string
  price: number
  /** Optional struck-through original price. */
  mrp?: number
  /** Image URL or data URL. */
  image: string
  /** True when the image is a company logo rather than a product photo. */
  isLogo?: boolean
  /** Hidden from the storefront when false. */
  active: boolean
}

export interface OrderItem {
  id: string
  name: string
  company: string
  categoryId: string
  size: string
  price: number
  qty: number
}

/**
 * A placed order, as the admin sees it: what was ordered and the calculated total — nothing about the customer.
 * (The server may still send older fields such as `customer` or `status` on existing orders; they are ignored.)
 */
export interface Order {
  id: string
  /** ISO date-time. */
  createdAt: string
  items: OrderItem[]
  total: number
  /** Generated demo order (can be cleared in one click). */
  sample?: boolean
}

export type HighlightIcon = 'shield' | 'layers' | 'truck' | 'handshake'

/** How the WhatsApp order message is written (Admin → WhatsApp message). */
export interface WhatsAppSettings {
  /** Optional opening line, before the shop details. */
  intro: string
  showShopName: boolean
  showAddress: boolean
  showPhone: boolean
  showHours: boolean
  /** Word(s) in front of the order number, e.g. "NEW ORDER". */
  orderLabel: string
  showDate: boolean
  /** detailed: name + brand + size on two lines · compact: one line per item. */
  itemStyle: 'detailed' | 'compact'
  /** "Items (3) — 14 units" heading. */
  showCounts: boolean
  /** Subtotal and discount lines when products have a higher MRP. */
  showDiscount: boolean
  totalLabel: string
  /** Closing note about delivery / payment (leave empty to hide). */
  note: string
  /** Last line, e.g. a thank-you (leave empty to hide). */
  closing: string
  divider: 'line' | 'dots' | 'none'
  emojis: boolean
}

export interface Settings {
  business: {
    name: string
    tagline: string
    address: string
    phone: string
    email: string
    hours: string
    /** With country code, digits only. Orders and enquiries are sent here. */
    whatsappNumber: string
    lat: number
    lng: number
  }
  hero: {
    line1: string
    line2: string
    highlight: string
    description: string
    badges: string[]
    primaryLabel: string
    secondaryLabel: string
  }
  shop: { title: string; text: string }
  about: {
    title: string
    intro: string
    foundedYear: number
    highlights: { icon: HighlightIcon; title: string; text: string }[]
  }
  contact: { title: string; text: string }
  whatsapp: WhatsAppSettings
}

export interface StoreState {
  products: Product[]
  categories: Category[]
  brands: Brand[]
  slides: Slide[]
  settings: Settings
  orders: Order[]
}
