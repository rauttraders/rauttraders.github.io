import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export default function Modal({ title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 max-md:p-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:bg-[#34353a] max-md:rounded-xl ${wide ? 'max-w-[680px]' : 'max-w-[460px]'}`}>
        <div className="flex items-center justify-between border-b border-[#ececf0] px-6 py-4 dark:border-[#45464c] max-md:px-4 max-md:py-3">
          <h2 className="m-0 text-[18px] font-extrabold text-ink max-md:text-[15.5px]">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-brand/10 hover:text-brand">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto p-6 max-md:p-4">{children}</div>
      </div>
    </div>
  )
}
