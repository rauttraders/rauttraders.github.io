import { ArrowLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from '../components/Navbar/BrandLogo'
import ProfileMenu from '../components/Navbar/ProfileMenu'
import Footer from '../components/Footer/Footer'
import { InfoPageSkeleton } from '../components/ui/Skeleton'
import { useLanguage } from '../hooks/useLanguage'
import { useTheme } from '../hooks/useTheme'
import { useStore } from '../store/StoreContext'

interface InfoPageLayoutProps {
  title: string
  subtitle: string
  icon: ReactNode
  children: ReactNode
}

/** Shared layout for legal and attribution pages (Privacy Policy, Terms, Return Policy, Image Credits). */
export default function InfoPageLayout({ title, subtitle, icon, children }: InfoPageLayoutProps) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { ready } = useStore()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f7] text-ink dark:bg-[#26272b]">
      <header className="sticky top-0 z-[1000] border-b border-[#ececf0] bg-white/90 backdrop-blur-md dark:border-[#45464c] dark:bg-[#34353a]/90">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-10 max-lg:h-14 max-lg:px-4">
          <Link to="/" className="no-underline">
            <BrandLogo href="/" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand/10 px-4 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white dark:bg-brand/20 max-sm:px-3 max-sm:text-[12px]"
            >
              <ArrowLeft size={14} aria-hidden />
              <span>{t('navHome')}</span>
            </Link>
            <ProfileMenu
              theme={theme}
              onThemeChange={setTheme}
              language={language}
              onLanguageChange={setLanguage}
              showLabel={false}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-6 py-10 max-md:px-4 max-md:py-6">
        <article>
          <div className="mb-7 flex items-start gap-4 border-b border-[#ececf0] pb-6 dark:border-[#45464c] max-md:mb-5 max-md:gap-3 max-md:pb-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20 max-md:h-10 max-md:w-10 max-md:rounded-xl">
              {icon}
            </span>
            <div className="min-w-0">
              <h1 className="m-0 text-[28px] font-extrabold leading-tight text-ink max-md:text-[22px]">{title}</h1>
              <p className="m-0 mt-1 text-[14px] text-muted max-md:text-[13px]">{subtitle}</p>
            </div>
          </div>

          <div className="space-y-6 text-[15px] leading-[1.7] text-muted max-md:space-y-5 max-md:text-[14px]">
            {ready ? children : <InfoPageSkeleton />}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
