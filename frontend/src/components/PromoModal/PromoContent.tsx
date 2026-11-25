import { useStore } from '../../store/StoreContext'

export default function PromoContent() {
  const { hero } = useStore().settings
  return (
    <>
      <h2 className="mt-9 text-[44px] font-light leading-[1.15] tracking-[-1.4px] text-ink max-lg:mt-5 max-lg:text-[36px] max-md:mt-3.5 max-md:text-[26px] max-md:tracking-[-0.8px]">
        {hero.line1}
        <br />
        {hero.line2} <span className="bg-gradient-to-r from-brand to-[#ff8a65] bg-clip-text font-extrabold text-transparent">{hero.highlight}</span>
      </h2>
      <p className="mt-5 max-w-[540px] text-lg font-light leading-[1.55] text-muted max-lg:mt-3.5 max-lg:text-[16px] max-md:mt-2.5 max-md:text-[14px] max-md:leading-[1.45]">
        {hero.description}
      </p>
    </>
  )
}
