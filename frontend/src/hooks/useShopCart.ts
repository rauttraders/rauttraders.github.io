import { useCallback, useEffect, useMemo, useState } from 'react'

const KEY = 'shop-cart'

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

/** Frontend-only basket: product id -> quantity, remembered in localStorage. */
export function useShopCart() {
  const [qtys, setQtys] = useState<Record<string, number>>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(qtys))
    } catch {
      /* storage unavailable — basket just won't persist */
    }
  }, [qtys])

  const setQty = useCallback((id: string, qty: number) => {
    setQtys((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, 999)
      return next
    })
  }, [])

  const itemCount = useMemo(() => Object.values(qtys).reduce((s, n) => s + n, 0), [qtys])
  return { qtys, setQty, itemCount }
}
