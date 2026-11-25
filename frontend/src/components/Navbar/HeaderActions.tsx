import BasketMenu from './BasketMenu'
import type { BasketItem } from './BasketMenu'
import ProfileMenu from './ProfileMenu'

export interface HeaderActionsProps {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  language: string
  onLanguageChange: (code: string) => void
  basketItems?: BasketItem[]
  onRemoveItem?: (id: string) => void
  onQtyChange?: (id: string, qty: number) => void
  onBag?: () => void
  onCheckout?: () => void
  basketOpen?: boolean
  onBasketOpenChange?: (open: boolean) => void
  /** Show text labels under icons (desktop). */
  showLabels?: boolean
  cartCount?: number
}

/** Right side of the navbar: MY ORDER (the page with the chosen items) and PROFILE (language + theme dropdown). */
export default function HeaderActions({ theme, onThemeChange, language, onLanguageChange, basketItems = [], onRemoveItem, onQtyChange, onBag, onCheckout, basketOpen, onBasketOpenChange, showLabels = true, cartCount = 0 }: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-[22px] max-md:gap-4">
      <BasketMenu items={basketItems} count={cartCount} onRemove={onRemoveItem} onQty={onQtyChange} onBrowse={onBag} onCheckout={onCheckout} open={basketOpen} onOpenChange={onBasketOpenChange} showLabel={showLabels} />
      <ProfileMenu theme={theme} onThemeChange={onThemeChange} language={language} onLanguageChange={onLanguageChange} showLabel={showLabels} />
    </div>
  )
}
