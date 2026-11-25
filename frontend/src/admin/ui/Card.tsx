import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#ececf0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-lg:p-4 max-md:rounded-xl max-md:p-3.5 ${className}`}>{children}</section>
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 max-md:mb-3">
      <h2 className="m-0 text-[16px] font-extrabold text-ink max-md:text-[14.5px]">{children}</h2>
      {action}
    </div>
  )
}

/** Card header for dashboard panels: icon tile, title, subheading, then a full-width grey divider line. */
export function PanelHeader({ icon: Icon, title, subtitle, action, className = '' }: { icon: LucideIcon; title: string; subtitle: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`-mx-5 mb-5 flex items-center gap-3 border-b border-[#e3e3e8] px-5 pb-4 dark:border-[#45464c] max-lg:-mx-4 max-lg:mb-4 max-lg:px-4 max-lg:pb-3 max-md:-mx-3.5 max-md:mb-3.5 max-md:gap-2.5 max-md:px-3.5 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20 max-md:h-8 max-md:w-8">
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-[15px] font-semibold leading-tight text-ink max-md:text-[14px]">{title}</h2>
        <p className="m-0 mt-0.5 text-[12.5px] text-muted max-md:text-[11.5px]">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export const btnPrimary =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand px-5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.3)] transition-all hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 max-md:h-9 max-md:px-4 max-md:text-[12px]'
export const btnSoft =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand/10 px-5 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white dark:bg-brand/20 max-md:h-9 max-md:px-4 max-md:text-[12px]'
export const btnDanger =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[#fdeaea] px-5 text-[13px] font-semibold text-[#c62f2c] transition-colors hover:bg-[#c62f2c] hover:text-white dark:bg-[#4a2f2f] dark:text-[#ff8a87] max-md:h-9 max-md:px-4 max-md:text-[12px]'
export const iconBtn =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-brand/10 hover:text-brand max-md:h-8 max-md:w-8'
