import logo from '../../assets/logo.png'

interface PromoHeaderProps {
  alt?: string
  /** Always show the white sticker border (for dark backgrounds). */
  sticker?: boolean
}

export default function PromoHeader({ alt = 'Raut Traders Wholesale', sticker = false }: PromoHeaderProps) {
  return <img src={logo} alt={alt} className={`block h-[58px] w-auto object-contain max-lg:h-[48px] max-md:h-[40px] ${sticker ? 'sticker-outline' : 'logo-outline'}`} />
}
