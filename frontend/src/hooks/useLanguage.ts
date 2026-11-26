import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TRANSLATIONS, type Lang, type TranslationKey } from '../i18n/translations'

export interface LanguageOption {
  code: Lang
  label: string
}

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
]

const KEY = 'language'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    return languages.some((l) => l.code === saved) ? (saved as Lang) : 'en'
  } catch {
    return 'en'
  }
}

interface LanguageApi {
  language: Lang
  setLanguage: (code: string) => void
  t: (key: TranslationKey) => string
}

const Ctx = createContext<LanguageApi | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Lang>(initial)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(KEY, language)
    } catch {
      /* ignore storage blocked */
    }
  }, [language])

  const value = useMemo<LanguageApi>(
    () => ({
      language,
      setLanguage: (code: string) => {
        if (languages.some((l) => l.code === code)) setLangState(code as Lang)
      },
      t: (key: TranslationKey) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key],
    }),
    [language],
  )

  return createElement(Ctx.Provider, { value }, children)
}

export function useLanguage() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    return {
      language: 'en' as Lang,
      setLanguage: () => {},
      t: (key: TranslationKey) => TRANSLATIONS.en[key],
    }
  }
  return ctx
}
