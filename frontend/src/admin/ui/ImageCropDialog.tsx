import { Columns2, Eraser, Minus, MoveHorizontal, Plus, RotateCcw, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { autoFit, encodeUnderLimit, loadImage, removeBackgroundSmart, type CropPreset } from '../imageTools'
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
  const [bgRemoved, setBgRemoved] = useState(false)
  const [bgBusy, setBgBusy] = useState(false)
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null)
  const [compareOn, setCompareOn] = useState(false)
  const [splitPct, setSplitPct] = useState(50)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const splitDrag = useRef(false)

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

  // The picture we actually draw: original, background-removed, or auto-fitted.
  const fitted = useMemo(() => {
    if (!img) return null
    if (bgRemoved && bgCanvas) {
      return { canvas: bgCanvas, w: bgCanvas.width, h: bgCanvas.height }
    }
    if (!auto) return { canvas: null as HTMLCanvasElement | null, w: img.naturalWidth, h: img.naturalHeight }
    const r = autoFit(img)
    return { canvas: r.canvas, w: r.canvas.width, h: r.canvas.height }
  }, [img, auto, bgRemoved, bgCanvas])

  const handleToggleBgRemove = async () => {
    if (!img || bgBusy) return
    if (bgRemoved) {
      setBgRemoved(false)
      setCompareOn(false)
      return
    }
    setBgBusy(true)
    try {
      const cut = bgCanvas ?? (await removeBackgroundSmart(img))
      setBgCanvas(cut)
      setBgRemoved(true)
      setCompareOn(true)
      setSplitPct(15)
      requestAnimationFrame(() => setSplitPct(50))
    } finally {
      setBgBusy(false)
    }
  }

  // Base size: auto-fit fills ~96% of the frame so uploaded product photos look large and sharp; profile photo fills the circle.
  const base = useMemo(() => {
    if (!fitted) return 1
    const contain = Math.min(stageW / fitted.w, stageH / fitted.h)
    if (auto) return contain * 0.96
    return preset.circle ? Math.max(stageW / fitted.w, stageH / fitted.h) : contain * 0.98
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

    const bcv = beforeCanvasRef.current
    if (bcv && img && compareOn) {
      bcv.width = stageW * dpr
      bcv.height = stageH * dpr
      const bctx = bcv.getContext('2d')!
      bctx.clearRect(0, 0, bcv.width, bcv.height)
      bctx.imageSmoothingQuality = 'high'
      bctx.save()
      bctx.translate((stageW / 2 + off.x) * dpr, (stageH / 2 + off.y) * dpr)
      const s = base * zoom * dpr
      bctx.scale(s, s)
      bctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight)
      bctx.restore()
    }
  }, [render, stageW, stageH, img, compareOn, off, base, zoom])

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
                style={{ width: stageW, height: stageH, background: bgRemoved ? undefined : preset.stage, touchAction: 'none' }}
                className={`relative mx-auto cursor-grab overflow-hidden rounded-xl outline-none ring-1 ring-black/10 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand ${bgRemoved ? 'checker-stage' : ''}`}
                onPointerDown={(e) => {
                  if (splitDrag.current) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }
                }}
                onPointerMove={(e) => {
                  if (splitDrag.current && stageRef.current) {
                    const rect = stageRef.current.getBoundingClientRect()
                    const pct = ((e.clientX - rect.left) / rect.width) * 100
                    setSplitPct(Math.max(4, Math.min(96, pct)))
                    return
                  }
                  if (drag.current) setOff(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y))
                }}
                onPointerUp={() => {
                  drag.current = null
                  splitDrag.current = false
                }}
                onKeyDown={(e) => {
                  const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key]
                  if (d) {
                    e.preventDefault()
                    setOff((o) => clamp(o.x + d[0], o.y + d[1]))
                  }
                }}
              >
                <canvas ref={canvasRef} style={{ width: stageW, height: stageH }} className="block" />
                {compareOn && bgRemoved && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden transition-[clip-path] duration-200 ease-out"
                      style={{
                        clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
                        transitionDuration: splitDrag.current ? '0ms' : '220ms',
                      }}
                    >
                      <canvas ref={beforeCanvasRef} style={{ width: stageW, height: stageH, background: preset.stage }} className="block" />
                    </div>
                    <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-black/65 px-2.5 py-0.5 text-[10.5px] font-bold text-white backdrop-blur">
                      Before
                    </span>
                    <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full bg-brand px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-sm">
                      After
                    </span>
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label="Drag to compare before and after"
                      aria-valuemin={4}
                      aria-valuemax={96}
                      aria-valuenow={Math.round(splitPct)}
                      style={{
                        left: `${splitPct}%`,
                        transition: splitDrag.current ? 'none' : 'left 220ms ease-out',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        splitDrag.current = true
                        stageRef.current?.setPointerCapture(e.pointerId)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { e.stopPropagation(); setSplitPct((p) => Math.max(4, p - 4)) }
                        if (e.key === 'ArrowRight') { e.stopPropagation(); setSplitPct((p) => Math.min(96, p + 4)) }
                      }}
                      className="absolute inset-y-0 z-20 -ml-3 flex w-6 cursor-ew-resize items-center justify-center focus-visible:outline-none"
                    >
                      <span className="h-full w-0.5 bg-white shadow-[0_0_8px_rgba(239,83,80,0.85)]" />
                      <span className="absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow-[0_4px_14px_rgba(239,83,80,0.5)] transition-transform hover:scale-110">
                        <MoveHorizontal size={14} aria-hidden />
                      </span>
                    </div>
                  </>
                )}
                {bgBusy && (
                  <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-black/15 backdrop-blur-[1px]">
                    <div className="bg-scan-line h-1/2 w-full bg-gradient-to-b from-transparent via-brand/40 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white drop-shadow">
                      Removing background…
                    </span>
                  </div>
                )}
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

              <div className="mx-auto mt-3 flex flex-wrap items-center justify-between gap-2.5" style={{ maxWidth: stageW }}>
                <button type="button" role="switch" aria-checked={auto} onClick={() => setAuto((a) => !a)} className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-ink">
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${auto ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${auto ? 'translate-x-4' : ''}`} />
                  </span>
                  <Sparkles size={14} aria-hidden className="text-brand" /> Auto-fit
                </button>
                <div className="flex items-center gap-2">
                  {bgRemoved && (
                    <button
                      type="button"
                      onClick={() => setCompareOn((c) => !c)}
                      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 text-[12px] font-semibold transition-colors ${compareOn ? 'bg-brand text-white' : 'bg-brand/10 text-brand hover:bg-brand/20'}`}
                    >
                      Compare <span aria-hidden className="h-3.5 w-px bg-current opacity-30" /> <Columns2 size={13} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!img || bgBusy}
                    onClick={() => void handleToggleBgRemove()}
                    className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-60 ${bgRemoved ? 'bg-brand text-white shadow-[0_3px_10px_rgba(239,83,80,0.3)]' : 'bg-brand/10 text-brand hover:bg-brand hover:text-white dark:bg-brand/20'}`}
                  >
                    {bgBusy ? 'Removing…' : bgRemoved ? 'BG removed' : 'Remove BG'}
                    <span aria-hidden className="h-3.5 w-px bg-current opacity-30" />
                    <Eraser size={13} aria-hidden />
                  </button>
                </div>
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
