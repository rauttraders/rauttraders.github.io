import { Home, Info, MessageSquareText, ShoppingBag, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  badge?: string
  icon?: LucideIcon
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  '#home': Home,
  '#shop': ShoppingBag,
  '#about': Info,
  '#contact': MessageSquareText,
}

interface NavigationLinksProps {
  items: NavItem[]
  orientation?: 'row' | 'column'
  onNavigate?: (item: NavItem) => void
  /** Href of the section currently in view; that link is highlighted. */
  activeHref?: string
  /** Called after any link is clicked (does not stop navigation) — e.g. to close the mobile menu. */
  onItemClick?: () => void
}

export default function NavigationLinks({ items, orientation = 'row', onNavigate, activeHref, onItemClick }: NavigationLinksProps) {
  const isSidebar = orientation === 'column'
  const dir = isSidebar ? 'flex-col items-stretch gap-1' : 'flex-row items-center gap-1'
  return (
    <nav aria-label="Main">
      <ul className={`m-0 flex list-none p-0 ${dir}`}>
        {items.map((item) => {
          const Icon = isSidebar ? (item.icon ?? DEFAULT_ICONS[item.href]) : undefined
          const isActive = activeHref === item.href
          return (
            <li key={item.label} className="relative">
              <a
                href={item.href}
                aria-current={isActive ? 'true' : undefined}
                onClick={(e) => {
                  onItemClick?.()
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate(item)
                  }
                }}
                className={`flex items-center gap-3 text-[14px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                  isSidebar ? 'rounded-xl px-3.5 py-2.5' : 'rounded-full px-4 py-2'
                } ${
                  isActive
                    ? 'bg-brand/10 text-brand dark:bg-brand/20'
                    : 'text-[#333] hover:bg-black/5 hover:text-brand dark:text-[#e4e4e7] dark:hover:bg-white/10'
                }`}
              >
                {Icon && (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-brand text-white shadow-[0_3px_8px_rgba(239,83,80,0.35)]' : 'bg-black/5 text-muted dark:bg-white/10'
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                  </span>
                )}
                <span>{item.label}</span>
              </a>
              {item.badge && (
                <sup className="ml-[2px] align-super text-[7px] font-bold text-[#EF5350]">{item.badge}</sup>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
