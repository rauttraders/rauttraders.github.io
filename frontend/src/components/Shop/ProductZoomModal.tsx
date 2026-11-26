import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatINR } from '../../lib/format'
import type { Product } from '../../store/types'
import { useLanguage } from '../../hooks/useLanguage'

interface Props {
  product: Product
  onClose: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const STEP = 0.5

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100))

const touchDist = (t1: React.Touch, t2: React.Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

/**
 * Centered lightbox modal to inspect and zoom a product image.
 * Supports two-finger pinch-to-zoom, mouse wheel zoom, drag-to-pan, and horizontal + vertical scrolling.
 */
export default function ProductZoomModal({ product, onClose }: Props) {
  const { t } = useLanguage()
  const [zoom, setZoom] = useState(1)
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null)

  const measureBase = useCallback(() => {
    const vp = viewportRef.current
    const im = imgRef.current
    if (!vp || !im || !im.naturalWidth || !im.naturalHeight) return
    const pad = 32
    const maxW = Math.max(160, vp.clientWidth - pad)
    const maxH = Math.max(160, vp.clientHeight - pad)
    const scale = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight)
    setBaseSize({ w: Math.round(im.naturalWidth * scale), h: Math.round(im.naturalHeight * scale) })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', measureBase)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measureBase)
      document.body.style.overflow = prev
    }
  }, [onClose, measureBase])

  // Mouse wheel zoom
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return
      e.preventDefault()
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [])

  const zoomIn = () => setZoom((z) => clampZoom(z + STEP))
  const zoomOut = () => setZoom((z) => clampZoom(z - STEP))

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e.touches[0], e.touches[1]), zoom }
    } else {
      pinchRef.current = null
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const next = pinchRef.current.zoom * (touchDist(e.touches[0], e.touches[1]) / pinchRef.current.dist)
      setZoom(clampZoom(next))
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || !viewportRef.current) return
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      sl: viewportRef.current.scrollLeft,
      st: viewportRef.current.scrollTop,
      moved: false,
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current
    const vp = viewportRef.current
    if (!d || !vp) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
    vp.scrollLeft = d.sl - dx
    vp.scrollTop = d.st - dy
  }

  const onMouseUp = () => {
    const moved = dragRef.current?.moved ?? false
    dragRef.current = null
    if (!moved && zoom === 1) setZoom(2)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px] max-md:p-2.5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} preview`}
    >
      <div className="flex h-[84vh] max-h-[680px] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)] dark:bg-[#34353a]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ececf0] px-5 py-3.5 dark:border-[#45464c] max-md:px-3.5 max-md:py-2.5">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-[15px] font-bold text-ink max-md:text-[13.5px]">{product.name}</h3>
            <p className="m-0 mt-0.5 truncate text-[12px] text-muted max-md:text-[11px]">
              {product.company}{product.size && product.size !== '0' ? ` · ${product.size}` : ''} · <span className="font-bold text-brand">{formatINR(product.price)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#e3e3e8] bg-white text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#55565d] dark:bg-[#2b2c30]"
            >
              <ZoomOut size={15} aria-hidden />
            </button>
            <span className="min-w-[40px] text-center text-[12px] font-bold text-muted">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#e3e3e8] bg-white text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#55565d] dark:bg-[#2b2c30]"
            >
              <ZoomIn size={15} aria-hidden />
            </button>
            {zoom > 1 && (
              <button
                type="button"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
                title="Reset zoom"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#e3e3e8] bg-white px-2.5 text-[12px] font-semibold text-muted transition-colors hover:border-brand hover:text-brand dark:border-[#55565d] dark:bg-[#2b2c30]"
              >
                {t('reset')}
                <span aria-hidden className="h-3.5 w-px bg-current opacity-30" />
                <RotateCcw size={13} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { dragRef.current = null }}
          className={`flex flex-1 overflow-auto bg-gradient-to-b from-cream to-white p-4 dark:from-[#3d3e44] dark:to-[#34353a] ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          style={{ touchAction: zoom > 1 ? 'pan-x pan-y' : 'pinch-zoom' }}
        >
          <img
            ref={imgRef}
            src={product.image}
            alt={product.name}
            draggable={false}
            onLoad={measureBase}
            style={
              baseSize
                ? { width: Math.round(baseSize.w * zoom), height: Math.round(baseSize.h * zoom), maxWidth: 'none', maxHeight: 'none' }
                : undefined
            }
            className={`m-auto shrink-0 select-none object-contain ${!baseSize ? 'max-h-full max-w-full' : ''} ${product.isLogo ? 'logo-outline' : ''}`}
          />
        </div>

        <p className="m-0 shrink-0 border-t border-[#ececf0] bg-white px-4 py-2 text-center text-[11.5px] text-muted dark:border-[#45464c] dark:bg-[#34353a]">
          {zoom > 1 ? t('zoomHintActive') : t('zoomHintIdle')}
        </p>
      </div>
    </div>,
    document.body,
  )
}
