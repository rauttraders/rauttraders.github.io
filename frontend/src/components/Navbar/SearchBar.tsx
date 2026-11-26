import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '../../hooks/useLanguage'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (query: string) => void
  onSearch?: (query: string) => void
  className?: string
}

export default function SearchBar({
  placeholder,
  value: controlledValue,
  onChange,
  onSearch,
  className = '',
}: SearchBarProps) {
  const { t } = useLanguage()
  const resolvedPlaceholder = placeholder ?? t('searchPlaceholder')
  const [internalValue, setInternalValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const update = (next: string) => {
    if (controlledValue === undefined) setInternalValue(next)
    onChange?.(next)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch?.(value.trim())
  }

  const clear = () => {
    update('')
    onSearch?.('')
    ref.current?.focus()
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      onClick={() => ref.current?.focus()}
      className={`flex h-10 cursor-text items-center gap-2 rounded-full border border-transparent bg-[#f3f3f6] pl-4 pr-2.5 transition-all focus-within:border-brand focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#43444a] dark:focus-within:bg-[#34353a] ${className}`}
    >
      <Search size={16} className="shrink-0 text-muted" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder={resolvedPlaceholder}
        aria-label="Search"
        className="w-full min-w-0 border-0 bg-transparent text-[13px] text-[#111] outline-none dark:text-[#f3f3f3] placeholder:text-[#696E79]"
      />
      {value && (
        <button
          type="button"
          aria-label={t('clearSearch')}
          onClick={(e) => {
            e.stopPropagation()
            clear()
          }}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted transition-colors hover:bg-black/10 hover:text-ink dark:hover:bg-white/10"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </form>
  )
}
