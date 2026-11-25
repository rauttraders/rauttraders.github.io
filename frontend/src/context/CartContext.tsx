import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getProduct } from '../data/catalog'
import type { CartLine, Customer } from '../types'
import { cartTotal } from '../lib/whatsapp'

interface CartContextValue {
  lines: CartLine[]
  itemCount: number
  total: number
  qtyOf: (id: string) => number
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
  customer: Customer
  setCustomer: (c: Customer) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [qtys, setQtys] = useState<Record<string, number>>(() => load('cart', {}))
  const [customer, setCustomer] = useState<Customer>(() => load('customer', { name: '', shopName: '', phone: '' }))

  useEffect(() => localStorage.setItem('cart', JSON.stringify(qtys)), [qtys])
  useEffect(() => localStorage.setItem('customer', JSON.stringify(customer)), [customer])

  const setQty = useCallback((id: string, qty: number) => {
    setQtys((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, 999)
      return next
    })
  }, [])
  const remove = useCallback((id: string) => setQty(id, 0), [setQty])
  const clear = useCallback(() => setQtys({}), [])

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(qtys).flatMap(([id, qty]) => {
      const product = getProduct(id)
      return product ? [{ product, qty }] : []
    })
    return {
      lines,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      total: cartTotal(lines),
      qtyOf: (id) => qtys[id] ?? 0,
      setQty,
      remove,
      clear,
      customer,
      setCustomer,
    }
  }, [qtys, customer, setQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
