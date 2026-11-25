import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface PopPos {
  top?: number
  bottom?: number
  left: number
  right: number
  width: number
  maxHeight: number
}

/** Anchored popover: opens under (or above, when short on space) a trigger, rendered via a portal so modals don't clip it. */
export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false)
  const anchor = useRef<T>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PopPos>({ left: 0, right: 0, width: 0, maxHeight: 320 })

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 14
    const above = r.top - 14
    const flip = below < 260 && above > below
    setPos({
      ...(flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      left: r.left,
      right: window.innerWidth - r.right,
      width: r.width,
      maxHeight: Math.max(160, flip ? above : below),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (!anchor.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const scroll = (e: Event) => {
      if (!pop.current?.contains(e.target as Node)) setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return { open, setOpen, anchor, pop, pos }
}
