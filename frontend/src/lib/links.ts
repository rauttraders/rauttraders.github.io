import type { Settings } from '../store/types'

export const whatsappUrl = (s: Settings, text = '') =>
  `https://wa.me/${s.business.whatsappNumber.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

/** Opens the chat straight in WhatsApp Web (for people logged in on a laptop/desktop browser). */
export const whatsappWebUrl = (s: Settings, text = '') =>
  `https://web.whatsapp.com/send?phone=${s.business.whatsappNumber.replace(/\D/g, '')}${text ? `&text=${encodeURIComponent(text)}` : ''}`

/** True when the admin has saved valid GPS coordinates. */
export const hasValidLocation = (s: Settings) =>
  Number.isFinite(s.business.lat) && Number.isFinite(s.business.lng) &&
  Math.abs(s.business.lat) <= 90 && Math.abs(s.business.lng) <= 180

export const mapEmbedUrl = (s: Settings) => `https://www.google.com/maps?q=${s.business.lat},${s.business.lng}&z=16&output=embed`
export const mapDirectionsUrl = (s: Settings) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.business.lat},${s.business.lng}`
