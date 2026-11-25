import { Languages, Moon, Palette, Sun, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { languages } from '../../hooks/useLanguage'

export interface ProfileMenuProps {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  language: string
  onLanguageChange: (code: string) => void
  showLabel?: boolean
}

/** Opens a small dropdown with the language and theme choices (there are no customer accounts). */
export default function ProfileMenu({ theme, onThemeChange, language, onLanguageChange }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Language and theme" title="Language and theme"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        <UserRound size={20} aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-[1100] mt-3 w-[236px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-[#ececf0] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.16)] dark:border-[#45464c] dark:bg-[#3a3b41]"
        >
          <div className="border-t border-[#ececf0] px-3 py-2.5 dark:border-[#45464c]">
            <p className="m-0 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              <Languages size={12} className="text-brand" aria-hidden /> Language
            </p>
            <div role="group" aria-label="Language" className="flex gap-1">
              {languages.map((l) => {
                const on = language === l.code
                return (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onLanguageChange(l.code)}
                    className={`h-7 flex-1 cursor-pointer whitespace-nowrap rounded-full border px-1 text-[12px] font-semibold transition-colors ${
                      on ? 'border-brand bg-brand text-white' : 'border-[#e3e3e8] bg-transparent text-ink hover:border-brand/60 hover:text-brand dark:border-[#55565d]'
                    }`}
                  >
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-[#ececf0] px-3 py-2.5 dark:border-[#45464c]">
            <Palette size={14} aria-hidden className="shrink-0 text-brand" />
            <span id={`${panelId}-theme`} className="flex-1 text-[13px] font-semibold text-ink">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-labelledby={`${panelId}-theme`}
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors ${theme === 'dark' ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}
            >
              <span className={`absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4 text-brand' : 'text-[#6b6c74]'}`}>
                {theme === 'dark' ? <Moon size={9} aria-hidden /> : <Sun size={9} aria-hidden />}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
