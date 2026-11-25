import { memo } from 'react'
import PromoHeader from './PromoHeader'
import PromoContent from './PromoContent'
import PromoActions from './PromoActions'
import HeroSlider from './HeroSlider'
import ClientLogos from './ClientLogos'
import type { ClientLogo } from './ClientLogos'
import { useStore } from '../../store/StoreContext'
import './promo-modal.css'

export interface PromoModalProps {
  onPrimary: () => void
  onSecondary: () => void
  primaryLabel?: string
  secondaryLabel?: string
  logos?: ClientLogo[]
}

/** Full-screen landing hero (first screen of the page). The page scrolls on to the sections below it. */
function PromoModal({
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  logos,
}: PromoModalProps) {
  const { hero } = useStore().settings
  return (
    <section
      id="home"
      aria-label="Welcome"
      className="flex min-h-[calc(100svh-64px)] w-full flex-col bg-[radial-gradient(ellipse_at_top_right,#ffeaea_0%,#ffffff_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,#3a2323_0%,#2b2c30_55%)] max-lg:min-h-[calc(100svh-56px)]"
    >
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-[minmax(0,53fr)_minmax(0,47fr)] items-center max-lg:grid-cols-1 max-lg:gap-6 max-lg:py-6 max-md:gap-5 max-md:py-4">
        <div className="pl-3.5 pr-12 max-xl:pl-10 max-lg:px-8 max-lg:pb-2 md:max-lg:flex md:max-lg:flex-col md:max-lg:items-center md:max-lg:text-center max-md:px-5">
          <PromoHeader />
          <PromoContent />
          <PromoActions
            primaryLabel={primaryLabel ?? hero.primaryLabel}
            secondaryLabel={secondaryLabel ?? hero.secondaryLabel}
            onPrimary={onPrimary}
            onSecondary={onSecondary}
          />
        </div>
        <div className="flex items-center justify-center max-lg:order-first max-lg:px-8 max-md:px-5">
          <HeroSlider />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-3.5 pb-8 max-xl:px-10 max-md:px-5 max-md:pb-5">
        <ClientLogos logos={logos} />
      </div>
    </section>
  )
}

export default memo(PromoModal)
