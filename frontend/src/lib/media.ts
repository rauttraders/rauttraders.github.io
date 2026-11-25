import { API_BASE } from './api'

/**
 * Pictures uploaded by the admin are stored by the API and referred to as "/uploads/<id>". When the website and the API
 * are on different sites that link must point at the API, otherwise the browser would look for the picture on the website.
 *   uploadUrl: what to put in <img src>      uploadRef: what to send back to the API when saving
 */
export const uploadUrl = (ref: string): string => (API_BASE && ref.startsWith('/uploads/') ? `${API_BASE}${ref}` : ref)

export const uploadRef = (url: string): string => (API_BASE && url.startsWith(`${API_BASE}/uploads/`) ? url.slice(API_BASE.length) : url)
