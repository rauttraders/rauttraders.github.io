import { CheckCircle2, CircleHelp, Info, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type DialogTone = 'danger' | 'success' | 'warning' | 'primary' | 'info'

export interface DialogOptions {
  title: string
  message?: ReactNode
  /** Key / value rows shown in a small panel (order number, total, product name…). */
  details?: { label: string; value: ReactNode }[]
  confirmLabel?: string
  /** Leave out for a one-button notice. */
  cancelLabel?: string
  tone?: DialogTone
  icon?: LucideIcon
}

type Ask = (o: DialogOptions) => Promise<boolean>

const Ctx = createContext<{ confirm: Ask; notice: (o: Omit<DialogOptions, 'cancelLabel'>) => Promise<void> } | null>(null)

const TONE: Record<DialogTone, { icon: LucideIcon; ring: string; btn: string }> = {
  danger: { icon: Trash2, ring: 'bg-[#fdeaea] text-[#c62f2c] dark:bg-[#4a2f2f] dark:text-[#ff8a87]', btn: 'bg-[#e53935] hover:bg-[#c62f2c] shadow-[0_4px_12px_rgba(229,57,53,0.35)]' },
  success: { icon: CheckCircle2, ring: 'bg-[#dff5e8] text-[#1c6b3c] dark:bg-[#1d3a2a] dark:text-[#7fd6a1]', btn: 'bg-[#1f9d57] hover:bg-[#188046] shadow-[0_4px_12px_rgba(31,157,87,0.35)]' },
  warning: { icon: TriangleAlert, ring: 'bg-[#fdf0d5] text-[#8a5a00] dark:bg-[#4a3a16] dark:text-[#f0c56b]', btn: 'bg-brand hover:bg-brand-hover shadow-[0_4px_12px_rgba(239,83,80,0.35)]' },
  primary: { icon: CircleHelp, ring: 'bg-brand/10 text-brand dark:bg-brand/20', btn: 'bg-brand hover:bg-brand-hover shadow-[0_4px_12px_rgba(239,83,80,0.35)]' },
  info: { icon: Info, ring: 'bg-[#e3effd] text-[#17519c] dark:bg-[#1c3350] dark:text-[#8fbcf5]', btn: 'bg-brand hover:bg-brand-hover shadow-[0_4px_12px_rgba(239,83,80,0.35)]' },
}

interface Pending extends DialogOptions {
  resolve: (v: boolean) => void
}

/** Site-styled confirmation / notice dialogs (replaces the browser's confirm() and alert()). Centered, keyboard friendly. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([])
  const current = queue[0]

  const confirm = useCallback<Ask>((o) => new Promise<boolean>((resolve) => setQueue((q) => [...q, { ...o, cancelLabel: o.cancelLabel ?? 'Cancel', resolve }])), [])
  const notice = useCallback(
    (o: Omit<DialogOptions, 'cancelLabel'>) =>
      new Promise<void>((resolve) => setQueue((q) => [...q, { ...o, tone: o.tone ?? 'info', confirmLabel: o.confirmLabel ?? 'Got it', resolve: () => resolve() }])),
    [],
  )
  const value = useMemo(() => ({ confirm, notice }), [confirm, notice])

  const close = (v: boolean) => {
    current?.resolve(v)
    setQueue((q) => q.slice(1))
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && <DialogView key={queue.length + (current.title ?? '')} opts={current} onClose={close} />}
    </Ctx.Provider>
  )
}

function DialogView({ opts, onClose }: { opts: Pending; onClose: (v: boolean) => void }) {
  const tone = TONE[opts.tone ?? 'primary']
  const Icon = opts.icon ?? tone.icon
  const ref = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)
  const hasCancel = !!opts.cancelLabel

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    // Destructive actions start on the safe button.
    ;(opts.tone === 'danger' && hasCancel ? cancelRef.current : okRef.current)?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        onClose(false)
      } else if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll<HTMLElement>('button:not([disabled])')
        if (!els?.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('keydown', key, true)
      prevFocus?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] motion-safe:animate-[dlg-fade_.15s_ease-out]" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby={opts.message ? 'dlg-msg' : undefined} className="w-full max-w-[420px] rounded-2xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] dark:bg-[#34353a] motion-safe:animate-[dlg-pop_.18s_ease-out]">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone.ring}`}><Icon size={26} aria-hidden /></span>
        <h2 id="dlg-title" className="mb-0 mt-4 text-[19px] font-semibold leading-snug text-ink">{opts.title}</h2>
        {opts.message && <p id="dlg-msg" className="mb-0 mt-2 text-[14px] leading-relaxed text-muted">{opts.message}</p>}

        {opts.details && opts.details.length > 0 && (
          <dl className="mb-0 mt-4 divide-y divide-[#ececf0] overflow-hidden rounded-xl bg-[#f7f5f5] text-left dark:divide-[#45464c] dark:bg-[#2b2c30]">
            {opts.details.map((d) => (
              <div key={d.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13px]">
                <dt className="shrink-0 text-muted">{d.label}</dt>
                <dd className="m-0 min-w-0 break-words text-right font-semibold text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className={`mt-6 grid gap-3 ${hasCancel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {hasCancel && (
            <button ref={cancelRef} type="button" onClick={() => onClose(false)} className="h-11 cursor-pointer rounded-full border-0 bg-[#f1f1f4] px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-[#e5e5ea] dark:bg-[#45464c] dark:hover:bg-[#55565d]">
              {opts.cancelLabel}
            </button>
          )}
          <button ref={okRef} type="button" onClick={() => onClose(true)} className={`h-11 cursor-pointer rounded-full border-0 px-4 text-[14px] font-semibold text-white transition-all active:scale-[0.98] ${tone.btn}`}>
            {opts.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): Ask {
  const v = useContext(Ctx)
  if (!v) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return v.confirm
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotice() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNotice must be used inside <ConfirmProvider>')
  return v.notice
}
