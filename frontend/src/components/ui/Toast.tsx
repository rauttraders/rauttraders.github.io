import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: Tone
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

const STYLES: Record<Tone, { box: string; Icon: typeof CheckCircle2 }> = {
  success: {
    box: 'border-[#b7ebd0] bg-[#eefaf4] text-[#1c6b3c] dark:border-[#2d5a42] dark:bg-[#1d3a2a] dark:text-[#7fd6a1]',
    Icon: CheckCircle2,
  },
  error: {
    box: 'border-[#f5c2c0] bg-[#fdeaea] text-[#c62f2c] dark:border-[#693636] dark:bg-[#4a2f2f] dark:text-[#ff8a87]',
    Icon: AlertCircle,
  },
  info: {
    box: 'border-[#ececf0] bg-white text-ink dark:border-[#45464c] dark:bg-[#34353a]',
    Icon: Info,
  },
}

/**
 * Global toast notifications:
 *  - Bottom-right on desktop (`lg:bottom-5 lg:right-5`)
 *  - Bottom-center on mobile and tablet (`max-lg:bottom-5 max-lg:left-1/2 max-lg:-translate-x-1/2`)
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = ++seq.current
      setItems((prev) => [...prev.slice(-3), { id, tone, message }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      {items.length > 0 &&
        createPortal(
          <div
            aria-live="polite"
            className="no-print pointer-events-none fixed bottom-5 right-5 z-[1400] flex w-[360px] max-w-[calc(100vw-24px)] flex-col gap-2 max-lg:left-1/2 max-lg:right-auto max-lg:-translate-x-1/2"
          >
            {items.map((t) => {
              const { box, Icon } = STYLES[t.tone]
              return (
                <div
                  key={t.id}
                  role={t.tone === 'error' ? 'alert' : 'status'}
                  style={{ animation: 'dlg-pop 180ms ease-out' }}
                  className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-[13px] font-semibold shadow-[0_10px_28px_rgba(0,0,0,0.14)] ${box}`}
                >
                  <Icon size={17} className="shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => dismiss(t.id)}
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current opacity-70 transition-opacity hover:opacity-100"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
