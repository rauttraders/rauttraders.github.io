import { Menu, Search, X } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import BrandLogo from './BrandLogo'
import NavigationLinks from './NavigationLinks'
import type { NavItem } from './NavigationLinks'
import SearchBar from './SearchBar'
import HeaderActions from './HeaderActions'
import type { BasketItem } from './BasketMenu'
import './navbar.css'

const SECTION_IDS = ['home', 'shop', 'about', 'contact']

/** Returns the href of whichever section is currently under the sticky header. */
function useActiveSection(): string {
  const [active, setActive] = useState('#home')
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.35
      let current = SECTION_IDS[0]
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      setActive(`#${current}`)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

export interface NavbarProps {
  items?: NavItem[]
  onSearch?: (query: string) => void
  theme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
  language?: string
  onLanguageChange?: (code: string) => void
  basketItems?: BasketItem[]
  onRemoveItem?: (id: string) => void
  onQtyChange?: (id: string, qty: number) => void
  onBag?: () => void
  onCheckout?: () => void
  basketOpen?: boolean
  onBasketOpenChange?: (open: boolean) => void
  cartCount?: number
  onNavigate?: (item: NavItem) => void
  onLogoClick?: () => void
}

const noop = () => {}

export const defaultNavItems: NavItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Shop', href: '#shop' },
  { label: 'About us', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

function Navbar({ items = defaultNavItems, onSearch, theme = 'light', onThemeChange = noop, language = 'en', onLanguageChange = noop, basketItems, onRemoveItem, onQtyChange, onBag, onCheckout, basketOpen, onBasketOpenChange, cartCount, onNavigate, onLogoClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const active = useActiveSection()
  const scrolled = useScrolled()

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className={`navbar sticky top-0 z-[1000] bg-white/90 backdrop-blur-md transition-shadow dark:bg-[#34353a]/90 ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="flex h-16 items-center gap-6 px-10 max-lg:h-14 max-lg:justify-between max-lg:gap-3 max-lg:px-4">
        <BrandLogo onClick={onLogoClick} />

        <div className="max-lg:hidden">
          <NavigationLinks items={items} onNavigate={onNavigate} activeHref={active} />
        </div>

        <div className="ml-auto flex items-center gap-[22px] max-lg:gap-2 max-md:gap-1.5">
          <SearchBar onSearch={onSearch} className="w-[340px] max-xl:w-[260px] max-lg:hidden" />
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-brand/10 hover:text-brand max-lg:flex"
          >
            <Search size={20} />
          </button>
          <HeaderActions
            theme={theme}
            onThemeChange={onThemeChange}
            language={language}
            onLanguageChange={onLanguageChange}
            basketItems={basketItems}
            onRemoveItem={onRemoveItem}
            onQtyChange={onQtyChange}
            onBag={onBag}
            onCheckout={onCheckout}
            basketOpen={basketOpen}
            onBasketOpenChange={onBasketOpenChange}
            cartCount={cartCount}
            showLabels={false}
          />
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-brand/10 hover:text-brand max-lg:flex"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="hidden px-4 pb-3 max-lg:block">
          <SearchBar onSearch={onSearch} className="w-full" />
        </div>
      )}

      {createPortal(
        <div className="lg:hidden" aria-hidden={!menuOpen}>
          <div
            onClick={() => setMenuOpen(false)}
            className={`fixed inset-0 z-[1100] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
              menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          <aside
            aria-label="Mobile navigation"
            className={`fixed inset-y-0 left-0 z-[1101] flex w-[280px] max-w-[82vw] flex-col bg-white shadow-[0_16px_48px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out dark:bg-[#2d2e33] ${
              menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#ececf0] px-4 dark:border-[#45464c]">
              <BrandLogo onClick={() => { setMenuOpen(false); onLogoClick?.() }} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink transition-colors hover:bg-brand/10 hover:text-brand"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavigationLinks
                items={items}
                orientation="column"
                onNavigate={onNavigate}
                activeHref={active}
                onItemClick={() => setMenuOpen(false)}
              />
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </header>
  )
}

export default memo(Navbar)
