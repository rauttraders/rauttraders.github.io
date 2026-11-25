import { Link } from 'react-router-dom'
import { countByCompany, getCategories, getCompanies } from '../data/catalog'

export default function HomePage() {
  return (
    <>
      <h1 className="text-[32px] font-light leading-[1.2] tracking-[-1px] text-ink max-md:text-[26px]">
        Order for your shop, <span className="font-medium text-brand">directly</span>
      </h1>
      <p className="mt-2 max-w-[520px] text-base font-light text-muted">
        Pick a company, choose quantities and send your order on WhatsApp.
      </p>

      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-ink">Shop by company</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {getCompanies().map((c) => (
          <Link
            key={c.id}
            to={`/products?company=${c.id}`}
            className="flex flex-col items-center gap-3 rounded-md border border-[#F0F0F0] bg-white p-5 text-center no-underline transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
          >
            {c.image ? (
              <img src={c.image} alt="" className="h-16 w-16 object-contain" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-2xl font-light text-brand">{c.name[0]}</span>
            )}
            <span className="text-sm font-semibold text-ink">{c.name}</span>
            <span className="-mt-2 text-xs text-muted">{countByCompany(c.id)} products</span>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-ink">Shop by category</h2>
      <div className="flex flex-wrap gap-2">
        {getCategories().map((c) => (
          <Link
            key={c.id}
            to={`/products?category=${c.id}`}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink no-underline hover:border-brand"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </>
  )
}
