import { useEffect, useState } from 'react'

export interface LanguageOption {
  code: string
  label: string
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
]

const KEY = 'language'

function initial(): string {
  const saved = localStorage.getItem(KEY)
  return languages.some((l) => l.code === saved) ? (saved as string) : 'en'
}

/** Remembers the visitor's language choice and sets <html lang>. (Text translation is not wired up yet.) */
export function useLanguage() {
  const [language, setLanguage] = useState<string>(initial)

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem(KEY, language)
  }, [language])

  return { language, setLanguage }
}
