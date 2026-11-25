import { LayoutGrid, SearchX, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../../store/StoreContext'
import Reveal from '../ui/Reveal'
import SectionHeader from '../ui/SectionHeader'
import FilterDropdown from './FilterDropdown'
import ProductShowCard from './ProductShowCard'

interface ShopSectionProps {
  query: string
  qtys: Record<string, number>
  onQty: (id: string, qty: number) => void
}

export default function ShopSection({ query, qtys, onQty }: ShopSectionProps) {
  const { products, categories, brands: brandList, settings, ready } = useStore()
  const logoOf = useMemo(() => new Map(brandList.map((b) => [b.name, b.logo])), [brandList])
  const showcaseProducts = useMemo(() => products.filter((p) => p.active), [products])
  const showcaseCategories = categories
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const brands = useMemo(() => [...new Set(showcaseProducts.map((p) => p.company))].sort(), [showcaseProducts])
  const items = useMemo(
    () => {
      const term = query.trim().toLowerCase()
      return showcaseProducts.filter(
        (p) =>
          (!category || p.categoryId === category) &&
          (!brand || p.company === brand) &&
          (!term || `${p.name} ${p.company} ${p.description}`.toLowerCase().includes(term)),
      )
    },
    [showcaseProducts, category, query, brand],
  )

  const categoryOptions = [
    { value: '', label: `All (${showcaseProducts.length})` },
    ...showcaseCategories.map((c) => ({
      value: c.id,
      label: `${c.name} (${showcaseProducts.filter((p) => p.categoryId === c.id).length})`,
    })),
  ]
  const brandOptions = [
    { value: '', label: `All brands (${brands.length})` },
    ...brands.map((b) => ({ value: b, label: `${b} (${showcaseProducts.filter((p) => p.company === b).length})` })),
  ]

  return (
    <section id="shop" aria-labelledby="shop-title" className="scroll-mt-16 bg-dots bg-[#faf7f7] py-16 dark:bg-[#26272b] max-md:py-10">
      <div className="mx-auto w-full max-w-[1200px] px-3.5 max-xl:px-10 max-md:px-5">
        <Reveal>
          <SectionHeader title={settings.shop.title} titleId="shop-title">
            {settings.shop.text}
          </SectionHeader>
        </Reveal>

        <div className="mb-6 mt-7 grid grid-cols-2 gap-4 max-sm:gap-2.5 md:max-w-[560px]">
          <FilterDropdown
            label="Category"
            icon={<LayoutGrid size={16} aria-hidden />}
            value={category ?? ''}
            options={categoryOptions}
            onChange={(v) => setCategory(v || null)}
          />
          <FilterDropdown
            label="Brand"
            icon={<Tag size={16} aria-hidden />}
            value={brand ?? ''}
            options={brandOptions}
            onChange={(v) => setBrand(v || null)}
          />
        </div>

        <p className="mb-5 mt-0 text-[13px] font-semibold text-muted" aria-live="polite">
          Showing <span className="text-brand">{items.length}</span> {items.length === 1 ? 'product' : 'products'}
        </p>

        {!ready ? (
          <p className="m-0 py-16 text-center text-[14px] text-muted">Loading products…</p>
        ) : showcaseProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-16 text-center text-muted">
            <LayoutGrid size={32} aria-hidden className="opacity-30" />
            <p className="m-0 text-[15px] font-semibold text-ink">No products added yet</p>
            <p className="m-0 text-[13px]">The admin can add products, categories and brands in the Admin panel.</p>
          </div>
        ) : items.length > 0 ? (
          <ul className="m-0 grid list-none grid-cols-4 gap-5 p-0 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {items.map((p, i) => (
              <li key={p.id} className="min-w-0">
                <Reveal delay={(i % 4) * 70} className="h-full">
                  <ProductShowCard product={p} qty={qtys[p.id] ?? 0} brandLogo={logoOf.get(p.company) || undefined} onQty={onQty} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-14 text-center text-muted">
            <SearchX size={28} aria-hidden />
            <p className="m-0 text-[15px]">No products match{query ? ` “${query}”` : ' this category'}.</p>
          </div>
        )}

      </div>
    </section>
  )
}
