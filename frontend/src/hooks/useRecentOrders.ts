import { useCallback, useEffect, useState } from 'react'
import type { ReceiptOrder } from '../components/Order/OrderReceipt'

const KEY = 'recent-orders'
const EVENT = 'recent-orders-changed'
export const ORDER_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const MAX_ORDERS = 10

interface StoredOrder {
  order: ReceiptOrder
  expiresAt: number
}

function readValidEntries(): StoredOrder[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(KEY)
      return []
    }
    const now = Date.now()
    const valid = parsed.filter(
      (x): x is StoredOrder =>
        Boolean(x) &&
        typeof x.expiresAt === 'number' &&
        x.expiresAt > now &&
        Boolean(x.order) &&
        typeof x.order.id === 'string' &&
        Array.isArray(x.order.items),
    )
    if (valid.length === 0) {
      localStorage.removeItem(KEY)
    } else if (valid.length !== parsed.length) {
      localStorage.setItem(KEY, JSON.stringify(valid))
    }
    return valid
  } catch {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore storage errors */
    }
    return []
  }
}

/** Saves a customer order in client localStorage with a 2-hour expiry. */
export function saveRecentOrder(order: ReceiptOrder) {
  try {
    const existing = readValidEntries().filter((e) => e.order.id !== order.id)
    const next: StoredOrder[] = [{ order, expiresAt: Date.now() + ORDER_TTL_MS }, ...existing].slice(0, MAX_ORDERS)
    localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore storage blocked/full */
  }
}

/** Removes only our recent-orders key from localStorage. */
export function clearStoredRecentOrders() {
  try {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore */
  }
}

/** Reads client-side recent orders (automatically expiring after 2 hours). */
export function useRecentOrders() {
  const [recentOrders, setRecentOrders] = useState<ReceiptOrder[]>(() => readValidEntries().map((e) => e.order))

  const refresh = useCallback(() => {
    setRecentOrders(readValidEntries().map((e) => e.order))
  }, [])

  useEffect(() => {
    const onSync = () => refresh()
    window.addEventListener(EVENT, onSync)
    window.addEventListener('focus', onSync)
    const id = window.setInterval(onSync, 60_000)
    return () => {
      window.removeEventListener(EVENT, onSync)
      window.removeEventListener('focus', onSync)
      window.clearInterval(id)
    }
  }, [refresh])

  return { recentOrders, clearRecentOrders: clearStoredRecentOrders }
}
