import { useStore } from '../../store/StoreContext'
import logo from '../../assets/sortlogo.png'

interface BrandLogoProps {
  href?: string
  onClick?: () => void
  /** Business name shown beside the logo. */
  name?: string
}

export default function BrandLogo({
  href = '#home',
  onClick,
  name: nameProp,
}: BrandLogoProps) {
  const { settings } = useStore()
  const name = nameProp ?? settings.business.name
  return (
    <a href={href} onClick={onClick} aria-label={`${name} — Home`} className="flex shrink-0 items-center gap-2.5">
      <img src={logo} alt="" className="sticker-logo block h-5 w-auto object-contain" />
      <span className={`flex flex-col pr-6 text-[12px] font-bold uppercase leading-[1.15] tracking-[0.4px] text-[#4a4a4a] dark:text-[#d0d0d4] max-md:hidden`}>
        {name.split(' ').map((word, i) => (
          <span key={i}>
            <span className={i === 0 ? "text-brand" : undefined}>{word.charAt(0)}</span>
            {word.slice(1)}
          </span>
        ))}
      </span>
    </a>
  )
}
