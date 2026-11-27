import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { whatsappUrl } from '../../lib/links'
import { useStore } from '../../store/StoreContext'
import { useLanguage } from '../../hooks/useLanguage'
import PromoHeader from '../PromoModal/PromoHeader'

const linkCls = 'text-[14px] text-[#c9c9ce] no-underline transition-colors hover:translate-x-0.5 hover:text-white inline-block'
const headCls = 'm-0 mb-4 inline-block border-b-2 border-brand pb-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-white'

export default function Footer() {
  const { settings } = useStore()
  const { t } = useLanguage()
  const company = settings.business
  const quickLinks = [
    { label: t('navHome'), to: '/#home' },
    { label: t('navProducts'), to: '/#shop' },
    { label: t('navAbout'), to: '/#about' },
    { label: t('navContact'), to: '/#contact' },
  ]
  const infoLinks = [
    { label: t('privacyPolicy'), to: '/privacy-policy' },
    { label: t('termsConditions'), to: '/terms-and-conditions' },
    { label: t('returnPolicy'), to: '/return-policy' },
    { label: t('imageCredits'), to: '/image-credits' },
  ]

  // Only render contact rows that have been filled in by the admin
  const contactRows = [
    company.address && { Icon: MapPin, content: <span>{company.address}</span> },
    company.phone && { Icon: Phone, content: <a href={`tel:${company.phone.replace(/\s/g, '')}`} className={linkCls}>{company.phone}</a> },
    company.email && { Icon: Mail, content: <a href={`mailto:${company.email}`} className={`${linkCls} break-all`}>{company.email}</a> },
    company.hours && { Icon: Clock, content: <span>{company.hours}</span> },
  ].filter(Boolean) as { Icon: typeof MapPin; content: React.ReactNode }[]

  const hasWhatsApp = company.whatsappNumber.replace(/\D/g, '').length >= 10

  return (
    <footer className="relative bg-[#1f2023] text-[#c9c9ce]">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-[#ff8a65] to-brand" />
      <div className="mx-auto w-full max-w-[1200px] px-3.5 pb-6 pt-12 max-xl:px-10 max-md:px-5">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1.4fr] gap-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <div className="flex flex-col items-start">
            <Link to="/" aria-label={`${company.name || 'Home'} — Home`} className="inline-block">
              <PromoHeader alt="" sticker />
            </Link>
            {company.tagline && <p className="mb-0 mt-4 max-w-[280px] text-[14px] leading-[1.4rem]">{company.tagline}</p>}
            {hasWhatsApp && (
              <a
                href={whatsappUrl(settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white no-underline shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-colors hover:bg-brand-hover"
              >
                {t('chatOnWhatsApp')}
                <span aria-hidden className="h-4 w-px bg-white/40" />
                <MessageCircle size={15} aria-hidden />
              </a>
            )}
          </div>

          <nav aria-label={t('quickLinks')}>
            <h3 className={headCls}>{t('quickLinks')}</h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {quickLinks.map((l) => (
                <li key={l.label}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('infoLabel')}>
            <h3 className={headCls}>{t('infoLabel')}</h3>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {infoLinks.map((l) => (
                <li key={l.to}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          {contactRows.length > 0 && (
            <div>
              <h3 className={headCls}>{t('contact')}</h3>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[14px]">
                {contactRows.map(({ Icon, content }, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-brand" />
                    {content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-[#3a3b40] pt-5 text-[13px]">
          <p className="m-0">© {new Date().getFullYear()} {company.name || 'Raut Traders'}. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  )
}
