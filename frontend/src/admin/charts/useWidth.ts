import { useEffect, useRef, useState } from 'react'

/** Tracks an element's width so SVG charts can redraw crisply at any size. */
export function useWidth<T extends HTMLElement>(min = 240, initial = 600) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(min, el.clientWidth))
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [min])
  return [ref, w] as const
}
