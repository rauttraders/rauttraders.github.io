import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  /** Icon shown on the right; defaults to a chevron. */
  icon?: LucideIcon
}

export default function Button({ variant = 'primary', icon: Icon = ChevronRight, children, className = '', ...rest }: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-brand hover:bg-brand-hover text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)]'
      : 'bg-transparent border border-black text-black hover:bg-transparent dark:border-white dark:text-white'
  return (
    <button
      type="button"
      className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-[28px] px-5 text-sm font-semibold uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-md:h-10 max-md:px-4 max-md:text-xs ${styles} ${className}`}
      {...rest}
    >
      <span>{children}</span>
      <span className="flex items-center gap-3">
        <span className="h-4 w-px bg-current opacity-40" aria-hidden />
        <Icon size={16} aria-hidden />
      </span>
    </button>
  )
}
