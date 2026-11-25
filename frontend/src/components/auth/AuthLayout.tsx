import { ArrowLeft, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'

interface AuthLayoutProps {
  illustration: ReactNode
  headline: string
  text: string
  bullets: string[]
  backTo: string
  backLabel: string
  children: ReactNode
}

/** Split sign-in / sign-up screen: illustration + message on the left, the form on the right (form only on phones). */
export default function AuthLayout({ illustration, headline, text, bullets, backTo, backLabel, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-lg:grid-cols-1">
      <aside className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#ef5350] via-[#f4655b] to-[#ff8a65] p-10 text-white lg:flex xl:p-14">
        <span aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/10" />
        <span aria-hidden className="absolute bottom-24 left-10 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <img src={logo} alt="Raut Traders" className="h-11 w-auto rounded-lg bg-white/95 object-contain p-1.5" />
        </div>
        <div className="relative flex flex-1 items-center justify-center py-6 max-md:hidden">{illustration}</div>
        <div className="relative max-w-[460px]">
          <h2 className="m-0 text-[28px] font-semibold leading-tight xl:text-[32px]">{headline}</h2>
          <p className="mb-0 mt-2.5 text-[15px] leading-relaxed text-white/85">{text}</p>
          <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[14px] font-semibold">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25"><Check size={14} strokeWidth={3} aria-hidden /></span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#ffeaea_0%,#ffffff_55%)] px-4 py-20 dark:bg-[radial-gradient(ellipse_at_top_right,#3a2323_0%,#2b2c30_55%)] max-lg:py-14 max-md:px-3 max-md:py-12">
        <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
        <Link to={backTo} className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[13px] font-semibold text-ink no-underline shadow-sm backdrop-blur hover:text-brand dark:bg-[#34353a]/80 max-md:left-3 max-md:top-3 max-md:px-3 max-md:py-1.5 max-md:text-xs lg:left-auto lg:right-5">
          <ArrowLeft size={15} aria-hidden /> {backLabel}
        </Link>
        <div className="relative z-10 flex w-full justify-center">{children}</div>
      </main>
    </div>
  )
}
