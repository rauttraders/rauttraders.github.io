import { Copyright, ExternalLink, Globe } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import InfoPageLayout from './InfoPageLayout'

const BRAND_SOURCES = [
  { brand: 'Britannia Industries', website: 'https://www.britannia.co.in', note: 'Brand logo & biscuit/bakery product imagery' },
  { brand: 'Gopal Snacks (Gopal Namkeen)', website: 'https://www.gopalsnacks.com', note: 'Brand logo & namkeen/wafer packaging imagery' },
  { brand: 'Patanjali Ayurved', website: 'https://www.patanjaliayurved.net', note: 'Brand logo & FMCG/personal care imagery' },
  { brand: 'Pushp Brand Spices', website: 'https://www.pushpbrand.com', note: 'Brand logo & spices packaging imagery' },
  { brand: 'DS Group (Dharampal Satyapal Group)', website: 'https://www.dsgroup.com', note: 'Brand logo & consumer product references' },
  { brand: 'Lotte India', website: 'https://www.lotteindia.com', note: 'Brand logo & confectionery product references' },
  { brand: 'Mayora India', website: 'https://www.mayoraindonesia.com', note: 'Brand logo & biscuit/confectionery imagery' },
  { brand: 'Jyothy Labs', website: 'https://www.jyothylabs.com', note: 'Brand logo & home/personal care references' },
  { brand: 'Nilons Enterprises', website: 'https://www.nilons.com', note: 'Brand logo & culinary product references' },
  { brand: 'Sunder', website: 'https://www.sunderfoods.com', note: 'Brand logo & food product references' },
  { brand: 'MamyPoko (Unicharm India)', website: 'https://www.unicharm.co.in', note: 'Brand logo & baby care product imagery' },
  { brand: 'Perfetti Van Melle (Boomer)', website: 'https://www.perfettivanmelle.com', note: 'Brand logo & confectionery references' },
]

const ASSET_SOURCES = [
  { name: 'Lucide Icons', website: 'https://lucide.dev', note: 'Open-source UI icons (ISC License)' },
  { name: 'Google Fonts (Nunito)', website: 'https://fonts.google.com/specimen/Nunito', note: 'Open-source typography (SIL Open Font License)' },
  { name: 'Unbagrnd', website: 'https://github.com/zidniryi/unbagrnd', note: 'Open-source background removal engine used in admin image preparation' },
]

function SiteFavicon({ website, label }: { website: string; label: string }) {
  const [failed, setFailed] = useState(false)
  let host = ''
  try {
    host = new URL(website).hostname
  } catch {
    host = ''
  }
  const src = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : ''
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ececf0] bg-white p-1 dark:border-[#45464c] dark:bg-[#34353a]">
      {src && !failed ? (
        <img
          src={src}
          alt={`${label} icon`}
          width={20}
          height={20}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-5 w-5 object-contain"
        />
      ) : (
        <Globe size={16} className="text-muted" aria-hidden />
      )}
    </span>
  )
}

export default function ImageCreditsPage() {
  const { business } = useStore().settings
  const name = business.name || 'Raut Traders'

  return (
    <InfoPageLayout
      title="Image Credits & Trademark Notice"
      subtitle={`Attribution for brand logos, product photography, and open-source assets used on ${name}`}
      icon={<Copyright size={24} aria-hidden />}
    >
      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">1. Trademark &amp; Product Image Ownership</h2>
        <p className="m-0">
          {name} is an independent wholesale distributor. All company names, brand logos, trademarks, and product packaging photographs displayed on this website belong exclusively to their respective brand owners and manufacturers. They are used solely for product identification and informational purposes so retailers can recognize genuine wholesale stock.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-3 text-[18px] font-bold text-ink max-md:text-[16px]">2. Brand &amp; Product Image Sources</h2>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {BRAND_SOURCES.map((item) => (
            <div key={item.brand} className="flex items-start gap-3 rounded-xl border border-[#ececf0] bg-[#faf7f7] p-3.5 dark:border-[#45464c] dark:bg-[#2b2c30]">
              <SiteFavicon website={item.website} label={item.brand} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-bold text-ink">{item.brand}</p>
                <p className="m-0 mt-0.5 text-[12.5px] text-muted">{item.note}</p>
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand no-underline hover:underline"
                >
                  {item.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} aria-hidden />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="m-0 mb-3 text-[18px] font-bold text-ink max-md:text-[16px]">3. Open-Source Tools, Icons &amp; Fonts</h2>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {ASSET_SOURCES.map((item) => (
            <div key={item.name} className="flex items-start gap-3 rounded-xl border border-[#ececf0] bg-[#faf7f7] p-3.5 dark:border-[#45464c] dark:bg-[#2b2c30]">
              <SiteFavicon website={item.website} label={item.name} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-bold text-ink">{item.name}</p>
                <p className="m-0 mt-0.5 text-[12.5px] text-muted">{item.note}</p>
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand no-underline hover:underline"
                >
                  {item.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} aria-hidden />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">4. Credit Updates or Removal Requests</h2>
        <p className="m-0">
          If you are a copyright or trademark owner and would like any image updated, credited differently, or removed immediately, please contact us via our{' '}
          <Link to="/#contact" className="font-semibold text-brand no-underline hover:underline">Contact Us</Link> section
          {business.email ? <> or email <a href={`mailto:${business.email}`} className="font-semibold text-brand no-underline hover:underline">{business.email}</a></> : null}. We respect intellectual property rights and act promptly on all requests.
        </p>
      </section>
    </InfoPageLayout>
  )
}
