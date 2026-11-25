import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatINR } from '../../lib/format'
import type { Product } from '../../store/types'

interface Props {
  product: Product
  onClose: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const STEP = 0.5

/**
 * Centered lightbox modal to inspect and zoom a product image.
 */
export default function ProductZoomModal({ product, onClose }: Props) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + STEP).toFixed(2)))
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - STEP).toFixed(2)))

  return createPortal(
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} preview`}
    >
      <div className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)] dark:bg-[#34353a]">
        <div className="flex items-center justify-between gap-3 border-b border-[#ececf0] px-5 py-3.5 dark:border-[#45464c] max-md:px-4 max-md:py-3">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-[15px] font-bold text-ink max-md:text-[14px]">{product.name}</h3>
            <p className="m-0 mt-0.5 truncate text-[12px] text-muted">
              {product.company} · {product.size} · <span className="font-bold text-brand">{formatINR(product.price)}</span>
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
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#e3e3e8] bg-white text-muted transition-colors hover:border-brand hover:text-brand dark:border-[#55565d] dark:bg-[#2b2c30]"
              >
                <RotateCcw size={14} aria-hidden />
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
          className="flex min-h-[280px] flex-1 items-center justify-center overflow-auto bg-gradient-to-b from-cream to-white p-4 dark:from-[#3d3e44] dark:to-[#34353a] max-md:min-h-[240px]"
          onClick={() => setZoom((z) => (z >= MAX_ZOOM ? MIN_ZOOM : +(z + STEP).toFixed(2)))}
          title={zoom >= MAX_ZOOM ? 'Click to reset zoom' : 'Click to zoom in'}
        >
          <img
            src={product.image}
            alt={product.name}
            draggable={false}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className={`max-h-[65vh] w-auto max-w-full object-contain transition-transform duration-200 ${zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'} ${product.isLogo ? 'logo-outline' : ''}`}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
