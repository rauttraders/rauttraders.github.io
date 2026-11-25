import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export default function SearchBar({
  placeholder = 'Search for products, brands and more',
  onSearch,
  className = '',
}: SearchBarProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch?.(value.trim())
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      onClick={() => ref.current?.focus()}
      className={`flex h-10 cursor-text items-center gap-2.5 rounded-full border border-transparent bg-[#f3f3f6] px-4 transition-all focus-within:border-brand focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#43444a] dark:focus-within:bg-[#34353a] ${className}`}
    >
      <Search size={16} className="shrink-0 text-muted" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full min-w-0 border-0 bg-transparent text-[13px] text-[#111] outline-none dark:text-[#f3f3f3] placeholder:text-[#696E79]"
      />
    </form>
  )
}
