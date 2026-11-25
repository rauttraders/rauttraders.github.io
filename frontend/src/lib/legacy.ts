/**
 * Older versions of this website saved customer details in the visitor's browser (name, shop, phone, address, order tracking
 * tokens). The site no longer collects any of that, but the old data would stay on shared or family computers forever.
 * Erase it on the next visit. (The current basket, language and theme are kept.)
 */
const LEGACY_KEYS = ['rt-customer', 'rt-my-orders', 'customer', 'cart']

export function purgeLegacyStorage(): void {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k)
  } catch {
    /* storage unavailable: nothing was saved there anyway */
  }
}

/**
 * Clickjacking guard. GitHub Pages cannot send the headers that forbid framing, so the site checks for itself: if it is
 * running inside another page's frame it shows nothing clickable (an attacker could otherwise lay an invisible copy of the
 * admin login over their own page and trick someone into typing there).
 */
export function isFramed(): boolean {
  try {
    return window.top !== window.self
  } catch {
    return true // reading window.top was blocked: we are in a frame from another site
  }
}

export function blockFramedPage(): void {
  document.documentElement.style.display = 'none'
  document.body.innerHTML = ''
  const p = document.createElement('p')
  p.textContent = 'This page cannot be shown inside another website.'
  document.body.append(p)
}
