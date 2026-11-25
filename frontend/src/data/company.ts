import type { Settings } from '../store/types'

// Default settings — used as a fallback when the server has no settings saved yet.
// Every field here is editable in Admin → Settings; nothing below is shown to customers
// until the admin fills it in and saves.
export const defaultSettings: Settings = {
  business: {
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    hours: '',
    whatsappNumber: '',
    lat: NaN,
    lng: NaN,
  },
  hero: {
    line1: 'Order Your Stock',
    line2: 'Delivered to Your',
    highlight: 'Doorstep',
    description:
      'Retailers trust us to get top company products delivered straight to their shop door — place your order and we handle the rest.',
    badges: ['Genuine products', 'Fast delivery', 'Fair pricing'],
    primaryLabel: 'Explore',
    secondaryLabel: 'My order',
  },
  shop: { title: 'Shop by category', text: 'Choose a category and add the products you need to your basket.' },
  about: {
    title: 'Supplying shops with the brands they trust',
    intro:
      'Raut Traders, led by Ganesh Raut and Suresh Raut, is a wholesale distribution partner for popular FMCG brands. We help retailers stock their counters with genuine products at fair wholesale prices, backed by dependable delivery and friendly support.',
    foundedYear: new Date().getFullYear(),
    highlights: [
      { icon: 'shield', title: 'Authorised supply', text: 'Genuine stock sourced directly from the brands we represent.' },
      { icon: 'layers', title: 'Wide brand range', text: 'Biscuits, snacks, staples, home care and more under one roof.' },
      { icon: 'truck', title: 'Doorstep delivery', text: 'Reliable delivery so your shelves never run empty.' },
      { icon: 'handshake', title: 'Retailer first', text: 'Fair pricing and friendly support for shops of every size.' },
    ],
  },
  whatsapp: {
    intro: '',
    showShopName: true,
    showAddress: true,
    showPhone: true,
    showHours: true,
    orderLabel: 'NEW ORDER',
    showDate: true,
    itemStyle: 'detailed',
    showCounts: true,
    showDiscount: true,
    totalLabel: 'TOTAL',
    note: 'Delivery & payment: to be confirmed by the shop.',
    closing: 'Thank you! 🙏',
    divider: 'line',
    emojis: true,
  },
  contact: {
    title: 'Become a retailer or ask us anything',
    text: "Tell us about your shop and what you need. We'll reply on WhatsApp with availability, pricing and delivery details.",
  },
}
