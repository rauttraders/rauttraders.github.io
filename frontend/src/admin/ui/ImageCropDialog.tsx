import { Minus, Plus, RotateCcw, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { autoFit, encodeUnderLimit, loadImage, type CropPreset } from '../imageTools'
import { btnPrimary, btnSoft } from './Card'

interface Props {
  /** A freshly chosen file, or the URL of an existing picture to re-adjust. */
  src: File | string
  preset: CropPreset
  onApply: (dataUrl: string) => void
  onCancel: () => void
}

const MAX_STAGE_W = 440
const MAX_STAGE_H = 340

/**
 * Crop dialog like a profile-photo editor: drag to move, slider / wheel to zoom, rule-of-thirds grid.
 * "Auto-fit" first removes a plain background and trims empty space so the subject is centred and sized to the frame.
 */
export default function ImageCropDialog({ src, preset, onApply, onCancel }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState('')
  const [aspectIdx, setAspectIdx] = useState(0)
  const [auto, setAuto] = useState(preset.autoFit)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const aspect = preset.aspects[aspectIdx]
  const stageW = Math.min(MAX_STAGE_W, Math.round(MAX_STAGE_H * aspect.ratio), typeof window === 'undefined' ? MAX_STAGE_W : window.innerWidth - 72)
  const stageH = Math.round(stageW / aspect.ratio)

  useEffect(() => {
    let alive = true
    loadImage(src).then((i) => alive && setImg(i)).catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [src])

  // The picture we actually draw: original, or auto-fitted (background removed + trimmed).
  const fitted = useMemo(() => {
    if (!img) return null
    if (!auto) return { canvas: null as HTMLCanvasElement | null, w: img.naturalWidth, h: img.naturalHeight }
    const r = autoFit(img)
    return { canvas: r.canvas, w: r.canvas.width, h: r.canvas.height }
  }, [img, auto])

  // Base size: auto-fit fills ~88% of the frame; the profile photo fills the circle; otherwise fit whole picture.
  const base = useMemo(() => {
    if (!fitted) return 1
    const contain = Math.min(stageW / fitted.w, stageH / fitted.h)
    if (auto) return contain * 0.88
    return preset.circle ? Math.max(stageW / fitted.w, stageH / fitted.h) : contain * 0.94
  }, [fitted, stageW, stageH, auto, preset.circle])

  const reset = useCallback(() => {
    setZoom(1)
    setOff({ x: 0, y: 0 })
  }, [])
  useEffect(reset, [aspectIdx, auto, img, reset])

  const render = useCallback(
    (cv: HTMLCanvasElement, W: number, H: number, f: number, fill?: string) => {
      const ctx = cv.getContext('2d')!
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(0, 0, cv.width, cv.height)
      }
      if (!img || !fitted) return
      ctx.imageSmoothingQuality = 'high'
      ctx.save()
      ctx.translate((W / 2 + off.x) * f, (H / 2 + off.y) * f)
      const s = base * zoom * f
      ctx.scale(s, s)
      ctx.drawImage(fitted.canvas ?? img, -fitted.w / 2, -fitted.h / 2, fitted.w, fitted.h)
      ctx.restore()
    },
    [img, fitted, off, base, zoom],
  )

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = stageW * dpr
    cv.height = stageH * dpr
    render(cv, stageW, stageH, dpr)
  }, [render, stageW, stageH])

  // Escape closes only this dialog (not the form underneath), wheel zooms.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', key, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', key, true)
      document.body.style.overflow = prev
    }
  }, [onCancel])
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => Math.min(4, Math.max(0.4, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  })

  const clamp = (x: number, y: number) => {
    if (!fitted) return { x, y }
    const hw = (fitted.w * base * zoom) / 2 + stageW / 2 - 24
    const hh = (fitted.h * base * zoom) / 2 + stageH / 2 - 24
    return { x: Math.max(-hw, Math.min(hw, x)), y: Math.max(-hh, Math.min(hh, y)) }
  }

  const apply = () => {
    const [ow, oh] = aspect.out
    const cv = document.createElement('canvas')
    cv.width = ow
    cv.height = oh
    render(cv, stageW, stageH, ow / stageW, preset.format === 'image/jpeg' ? (preset.fill ?? '#fff') : undefined)
    onApply(encodeUnderLimit(cv, preset.format))
  }

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={preset.title} className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)] dark:bg-[#34353a]">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-3.5 dark:border-[#45464c]">
          <h2 className="m-0 text-[16px] font-semibold text-ink">{preset.title}</h2>
          <button type="button" aria-label="Close" onClick={onCancel} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-brand/10 hover:text-brand"><X size={18} aria-hidden /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {error ? (
            <p role="alert" className="m-0 py-10 text-center text-[13px] font-semibold text-[#c62f2c]">{error}</p>
          ) : (
            <>
              {preset.aspects.length > 1 && (
                <div role="group" aria-label="Shape" className="mb-3 flex justify-center gap-1.5">
                  {preset.aspects.map((a, i) => (
                    <button key={a.label} type="button" aria-pressed={i === aspectIdx} onClick={() => setAspectIdx(i)} className={`h-8 cursor-pointer rounded-full border-0 px-4 text-[12px] font-semibold transition-colors ${i === aspectIdx ? 'bg-brand text-white' : 'bg-brand/10 text-brand hover:bg-brand/20'}`}>{a.label}</button>
                  ))}
                </div>
              )}

              <div
                ref={stageRef}
                role="img"
                aria-label="Crop area. Drag to move the picture."
                tabIndex={0}
                style={{ width: stageW, height: stageH, background: preset.stage, touchAction: 'none' }}
                className="relative mx-auto cursor-grab overflow-hidden rounded-xl outline-none ring-1 ring-black/10 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }
                }}
                onPointerMove={(e) => drag.current && setOff(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y))}
                onPointerUp={() => (drag.current = null)}
                onKeyDown={(e) => {
                  const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key]
                  if (d) {
                    e.preventDefault()
                    setOff((o) => clamp(o.x + d[0], o.y + d[1]))
                  }
                }}
              >
                <canvas ref={canvasRef} style={{ width: stageW, height: stageH }} className="block" />
                {!img && <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-muted">Loading…</span>}
                {/* rule-of-thirds grid */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {[33.333, 66.666].map((p) => (
                    <span key={`v${p}`} className="absolute inset-y-0 w-px bg-white/70 shadow-[0_0_0_0.5px_rgba(0,0,0,0.25)]" style={{ left: `${p}%` }} />
                  ))}
                  {[33.333, 66.666].map((p) => (
                    <span key={`h${p}`} className="absolute inset-x-0 h-px bg-white/70 shadow-[0_0_0_0.5px_rgba(0,0,0,0.25)]" style={{ top: `${p}%` }} />
                  ))}
                  <span className="absolute inset-0 border-2 border-white/80" />
                </div>
                {preset.circle && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle closest-side at 50% 50%, transparent calc(100% - 1px), rgba(0,0,0,0.5) 100%)' }} />}
              </div>

              <div className="mx-auto mt-4 flex items-center gap-3" style={{ maxWidth: stageW }}>
                <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, z / 1.15))} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-brand/10 text-brand hover:bg-brand hover:text-white"><Minus size={15} aria-hidden /></button>
                <input type="range" aria-label="Zoom" min="0.4" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="range-input" />
                <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.15))} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-brand/10 text-brand hover:bg-brand hover:text-white"><Plus size={15} aria-hidden /></button>
                <button type="button" aria-label="Reset position and zoom" title="Reset" onClick={reset} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:text-brand"><RotateCcw size={15} aria-hidden /></button>
              </div>

              <div className="mx-auto mt-3 flex flex-col gap-1.5" style={{ maxWidth: stageW }}>
                <button type="button" role="switch" aria-checked={auto} onClick={() => setAuto((a) => !a)} className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-ink">
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${auto ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${auto ? 'translate-x-4' : ''}`} />
                  </span>
                  <Sparkles size={14} aria-hidden className="text-brand" /> Auto-fit
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ececf0] px-5 py-3.5 dark:border-[#45464c]">
          <button type="button" className={btnSoft} onClick={onCancel}>Cancel</button>
          <button type="button" className={btnPrimary} disabled={!img} onClick={apply}>Apply</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
