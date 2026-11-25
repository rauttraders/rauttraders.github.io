import Reveal from '../ui/Reveal'
import SectionHeader from '../ui/SectionHeader'
import { CalendarDays, Clock, Handshake, Layers, Mail, MapPin, Navigation, Package, Phone, ShieldCheck, Tag, Truck } from 'lucide-react'
import { hasValidLocation, mapDirectionsUrl, mapEmbedUrl } from '../../lib/links'
import { useStore } from '../../store/StoreContext'

const statIcons = { tag: Tag, package: Package, calendar: CalendarDays }
const icons = { shield: ShieldCheck, layers: Layers, truck: Truck, handshake: Handshake }

export default function AboutSection() {
  const { settings, products } = useStore()
  const { business: company, about } = settings
  const visible = products.filter((p) => p.active)
  const hasLocation = hasValidLocation(settings)
  const aboutStats = [
    { icon: 'tag', value: `${new Set(visible.map((p) => p.company)).size}+`, label: 'Brands' },
    { icon: 'package', value: `${visible.length}+`, label: 'Products' },
    { icon: 'calendar', value: `${Math.max(0, new Date().getFullYear() - about.foundedYear)}+`, label: 'Years' },
  ]
  // Only show contact rows that have been filled in
  const contactRows = [
    { Icon: MapPin, label: 'Address', value: company.address, href: undefined, span2: true },
    { Icon: Phone, label: 'Phone', value: company.phone, href: `tel:${company.phone.replace(/\s/g, '')}`, span2: false },
    { Icon: Mail, label: 'Email', value: company.email, href: `mailto:${company.email}`, span2: false },
    { Icon: Clock, label: 'Hours', value: company.hours, href: undefined, span2: true },
  ].filter((r) => r.value.trim())

  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-16 bg-white py-16 dark:bg-[#2d2e33] max-lg:py-12 max-md:py-8">
      <div className="mx-auto w-full max-w-[1200px] px-3.5 max-xl:px-10 max-md:px-4">
        <div className="grid grid-cols-2 items-start gap-10 max-lg:grid-cols-1 max-lg:gap-8 max-md:gap-6">
          <Reveal>
            <SectionHeader title={about.title} titleId="about-title" />
            <p className="mb-0 mt-4 text-[15px] leading-[1.6rem] text-muted max-md:mt-2.5 max-md:text-[13.5px] max-md:leading-[1.35rem]">{about.intro}</p>

            <dl className="m-0 mt-6 grid grid-cols-3 gap-3 max-md:mt-4 max-md:gap-2">
              {aboutStats.map((s) => {
                const Icon = statIcons[s.icon as keyof typeof statIcons]
                return (
                  <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[#ececf0] bg-[#faf7f7] p-3 dark:border-[#45464c] dark:bg-[#34353a] max-md:flex-col max-md:items-center max-md:gap-1.5 max-md:p-2.5 max-md:text-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_10px_rgba(239,83,80,0.35)] max-md:h-8 max-md:w-8">
                      <Icon size={18} aria-hidden />
                    </span>
                    <div className="flex items-baseline gap-1.5 max-md:flex-col max-md:items-center max-md:gap-0.5">
                      <dd className="m-0 text-[26px] font-bold leading-none text-brand max-lg:text-[22px] max-md:text-[18px]">{s.value}</dd>
                      <dt className="text-sm font-semibold text-muted max-md:text-[11px]">{s.label}</dt>
                    </div>
                  </div>
                )
              })}
            </dl>

            <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-4 p-0 max-lg:mt-6 max-md:mt-5 max-md:gap-2.5">
              {about.highlights.map((h) => {
                const Icon = icons[h.icon]
                return (
                  <li key={h.title} className="group rounded-2xl border border-[#ececf0] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_10px_24px_rgba(239,83,80,0.15)] dark:border-[#45464c] dark:bg-[#34353a] max-md:rounded-xl max-md:p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white max-md:h-8 max-md:w-8">
                      <Icon size={17} aria-hidden />
                    </span>
                    <h3 className="mb-0 mt-3 text-[15px] font-bold text-ink max-md:mt-2 max-md:text-[13px] max-md:leading-tight">{h.title}</h3>
                    <p className="mb-0 mt-1 text-[13px] leading-[1.3rem] text-muted max-md:text-[11.5px] max-md:leading-[1.05rem]">{h.text}</p>
                  </li>
                )
              })}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-3xl border border-[#ececf0] bg-white shadow-[0_14px_40px_rgba(239,83,80,0.14)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:rounded-2xl">
              {/* Map — only rendered when the admin has set valid coordinates */}
              {hasLocation ? (
                <div className="relative">
                  <iframe
                    title={`${company.name || 'Shop'} location map`}
                    src={mapEmbedUrl(settings)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block h-[320px] w-full border-0 max-lg:h-[260px] max-md:h-[210px]"
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-10 bg-gradient-to-t from-white to-transparent dark:from-[#34353a]" />
                  {company.name && (
                    <span className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-4 text-[13px] font-bold text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)] dark:bg-[#2b2c30]/95">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><MapPin size={14} aria-hidden /></span>
                      {company.name}
                    </span>
                  )}
                  <a
                    href={mapDirectionsUrl(settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 z-10 flex h-9 items-center gap-2 rounded-full bg-brand px-4 text-[12px] font-semibold text-white no-underline shadow-[0_4px_14px_rgba(239,83,80,0.45)] transition-colors hover:bg-brand-hover"
                  >
                    Open in Maps
                    <span aria-hidden className="h-4 w-px bg-white/50" />
                    <Navigation size={13} aria-hidden />
                  </a>
                </div>
              ) : (
                // Placeholder shown before the admin sets the location
                <div className="flex h-[180px] flex-col items-center justify-center gap-2 bg-[#faf7f7] dark:bg-[#2b2c30]">
                  <MapPin size={28} className="text-muted/40" aria-hidden />
                  <p className="m-0 text-center text-[13px] text-muted">
                    Map not configured yet.<br />Set coordinates in <strong>Admin → Settings</strong>.
                  </p>
                </div>
              )}

              {/* Contact details — only rows with actual values are shown */}
              {contactRows.length > 0 && (
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-5 pt-3 max-sm:grid-cols-1 max-md:gap-2 max-md:p-3.5 max-md:pt-2.5">
                  {contactRows.map(({ Icon, label, value, href, span2 }) => (
                    <li key={label} className={`flex items-start gap-3 rounded-2xl bg-[#fff4f4] p-3.5 dark:bg-[#3a2e2e] max-md:rounded-xl max-md:p-2.5 ${span2 ? 'col-span-2 max-sm:col-span-1' : ''}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_3px_8px_rgba(239,83,80,0.35)] max-md:h-8 max-md:w-8"><Icon size={15} aria-hidden /></span>
                      <div className="min-w-0 text-[14px] max-md:text-[12.5px]">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
                        {href ? (
                          <a href={href} className="break-words font-semibold text-ink no-underline hover:text-brand">{value}</a>
                        ) : (
                          <span className="font-semibold text-ink">{value}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
