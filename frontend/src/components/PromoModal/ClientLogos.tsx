import { bundledCompanyLogos } from '../../store/seed'
import { useStore } from '../../store/StoreContext'

export interface ClientLogo {
  name: string
  src: string
}

interface ClientLogosProps {
  logos?: ClientLogo[]
}

/** Infinite right-to-left marquee of client logos; pauses on hover. */
export default function ClientLogos({ logos: logosProp }: ClientLogosProps) {
  const { brands } = useStore()
  const brandLogos = brands.filter((b) => b.logo).map((b) => ({ name: b.name, src: b.logo }))
  const logos = logosProp ?? (brandLogos.length > 0 ? brandLogos : bundledCompanyLogos)
  if (logos.length === 0) return null
  return (
    <div
      className="logo-marquee overflow-hidden"
      aria-label="Our partner companies"
      style={{ ['--marquee-time' as string]: `${logos.length * 3.2}s` }}
    >
      <ul className="logo-marquee-track m-0 flex w-max list-none items-center p-0">
        {[...logos, ...logos].map((logo, i) => (
          <li
            key={i}
            aria-hidden={i >= logos.length}
            className="logo-item mx-8 flex h-20 shrink-0 items-center px-2 max-md:mx-4 max-md:h-13 max-md:px-1.5"
          >
            <img src={logo.src} alt={i < logos.length ? logo.name : ''} className="logo-outline h-14 w-auto max-w-[195px] object-contain max-md:h-10 max-md:max-w-[135px]" draggable={false} />
          </li>
        ))}
      </ul>
    </div>
  )
}
