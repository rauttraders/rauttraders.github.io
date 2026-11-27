import { useCallback, useEffect, useMemo, useState } from 'react'

const KEY = 'shop-cart'
const CART_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

interface StoredCart {
  qtys: Record<string, number>
  expiresAt: number
}

function sanitizeQtys(obj: unknown): Record<string, number> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k] = Math.min(Math.floor(v), 999)
    }
  }
  return out
}

function load(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<StoredCart> | Record<string, number>
    if (parsed && typeof parsed === 'object' && 'qtys' in parsed && typeof parsed.expiresAt === 'number') {
      if (parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(KEY)
        return {}
      }
      return sanitizeQtys(parsed.qtys)
    }
    // Migrate legacy un-expiring cart format gracefully
    return sanitizeQtys(parsed)
  } catch {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    return {}
  }
}

/** Frontend-only basket: product id -> quantity, remembered in localStorage with a 2-hour expiry. */
export function useShopCart() {
  const [qtys, setQtys] = useState<Record<string, number>>(load)

  useEffect(() => {
    try {
      if (Object.keys(qtys).length === 0) {
        localStorage.removeItem(KEY)
      } else {
        const payload: StoredCart = { qtys, expiresAt: Date.now() + CART_TTL_MS }
        localStorage.setItem(KEY, JSON.stringify(payload))
      }
    } catch {
      /* storage unavailable — basket just won't persist */
    }
  }, [qtys])

  useEffect(() => {
    const checkExpiry = () => {
      try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as Partial<StoredCart>
        if (typeof parsed?.expiresAt === 'number' && parsed.expiresAt <= Date.now()) {
          localStorage.removeItem(KEY)
          setQtys({})
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('focus', checkExpiry)
    const id = window.setInterval(checkExpiry, 60_000)
    return () => {
      window.removeEventListener('focus', checkExpiry)
      window.clearInterval(id)
    }
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setQtys((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, 999)
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setQtys({})
  }, [])

  const itemCount = useMemo(() => Object.values(qtys).reduce((s, n) => s + n, 0), [qtys])
  return { qtys, setQty, clearCart, itemCount }
}
