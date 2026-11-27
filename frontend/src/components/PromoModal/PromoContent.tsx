import { useStore } from '../../store/StoreContext'
import { useLanguage } from '../../hooks/useLanguage'

export default function PromoContent() {
  const { hero } = useStore().settings
  const { tSetting } = useLanguage()
  return (
    <>
      <h1 className="mt-9 text-[44px] font-light leading-[1.15] tracking-[-1.4px] text-ink max-lg:mt-5 max-lg:text-[36px] max-md:mt-3.5 max-md:text-[26px] max-md:tracking-[-0.8px]">
        {tSetting(hero.line1, 'heroLine1')}
        <br />
        {tSetting(hero.line2, 'heroLine2')} <span className="bg-gradient-to-r from-brand to-[#ff8a65] bg-clip-text font-extrabold text-transparent">{tSetting(hero.highlight, 'heroHighlight')}</span>
      </h1>
      <p className="mt-5 max-w-[540px] text-lg font-light leading-[1.55] text-muted max-lg:mt-3.5 max-lg:text-[16px] max-md:mt-2.5 max-md:text-[14px] max-md:leading-[1.45]">
        {tSetting(hero.description, 'heroDesc')}
      </p>
    </>
  )
}
